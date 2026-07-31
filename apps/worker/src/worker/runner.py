"""Long-polls the API for assigned jobs and runs them via a backend."""

from __future__ import annotations

import json
import logging
import os
import shutil
import threading
import time
from typing import Any

from worker.api import ApiError, WorkerApi
from worker.backends.apptainer import ApptainerBackend
from worker.backends.base import BackendDispatch, BackendMount, ExecutionBackend
from worker.backends.docker import DockerBackend
from worker.log_shipper import current_job_id
from worker.staging import (
    StageInEntry,
    StageOutEntry,
    StageOutResult,
    stage_in,
    stage_out,
)

# Per-core average power assumption (W). The DPMC isn't wired to read RAPL
# / NVML directly yet, so we estimate `avg_power = (cpu_seconds / wall) *
# POWER_PER_CORE_W` — proportional to actual CPU usage. 15W per fully-used
# core is a reasonable midpoint for modern server CPUs (server CPUs sit
# between 5W idle and 30W boost per core depending on SKU).
POWER_PER_CORE_W = 15.0

log = logging.getLogger("worker.runner")

# Worker-side view of the per-task working directory. Must match the docker
# host bind mount (data/warhol/runs → /repo/data/warhol/runs) so that files
# the worker writes here are visible to job containers via the host path the
# API embeds in dispatch.mounts.
WORKDIR_BASE = "/repo/data/warhol/runs"

# Staged workdirs are transient: inputs come from S3, outputs go back to S3,
# logs are shipped to host_log — so they are deleted once the job reaches a
# terminal state (a campaign leaves thousands of ~35MB dirs otherwise, until
# stage-in dies on "No space left on device"). Set to keep them for debugging.
KEEP_WORKDIR = os.environ.get("DPMC_KEEP_WORKDIR") == "1"


class Runner:
    def __init__(
        self,
        api: WorkerApi,
        host_id: int,
        *,
        poll_interval_s: float = 2.0,
        backends: dict[str, ExecutionBackend] | None = None,
        s3_client: Any | None = None,
        s3_bucket: str | None = None,
    ) -> None:
        self._api = api
        self._host_id = host_id
        self._poll_interval_s = poll_interval_s
        self._stop = threading.Event()
        self._backends = backends if backends is not None else {
            "Docker": DockerBackend(),
            "Apptainer": ApptainerBackend(),
        }
        self._s3 = s3_client
        self._s3_bucket = s3_bucket

    def run(self) -> None:
        while not self._stop.is_set():
            try:
                payload = self._api.next_job(self._host_id)
            except ApiError as exc:
                log.warning("next_job failed: %s", exc)
                self._stop.wait(self._poll_interval_s)
                continue
            if payload is None:
                self._stop.wait(self._poll_interval_s)
                continue
            self._execute(payload)

    def stop(self) -> None:
        self._stop.set()

    def _execute(self, payload: dict[str, Any]) -> None:
        runtime = payload.get("runtime", "None")
        backend = self._backends.get(runtime)
        if backend is None:
            log.error("No backend for runtime=%s job=%s", runtime, payload.get("jobId"))
            self._report_failure(payload, f"runtime {runtime} not supported")
            return
        try:
            resources = payload.get("resources", {})
            dispatch = BackendDispatch(
                image=payload.get("image"),
                command=payload.get("command", []),
                env=payload.get("env", {}),
                mounts=[
                    BackendMount(
                        source=m["source"],
                        target=m["target"],
                        read_only=bool(m.get("readOnly", False)),
                    )
                    for m in payload.get("mounts", [])
                ],
                cpus=float(resources.get("cpus", 0) or 0),
                memory_bytes=int(resources.get("memoryBytes", 0) or 0),
                gpus=resources.get("gpus", []),
            )
        except (KeyError, TypeError, ValueError) as exc:
            self._report_failure(payload, f"invalid dispatch payload: {exc}")
            return

        job_id = payload["jobId"]

        # Resolve the worker-side workdir for this job. The batchId is in env,
        # injected by the API alongside the bind mount targeting the same dir
        # on the host. We key by batch (not task) so sibling batches in a
        # Chain don't trample each other's /work files. If the API didn't
        # request any staging, skip silently and run the legacy bind-mount
        # flow.
        stage_in_decls = payload.get("stageIn") or []
        stage_out_decls = payload.get("stageOut") or []
        batch_id = (payload.get("env") or {}).get("DPMC_BATCH_ID")
        workdir = os.path.join(WORKDIR_BASE, batch_id) if batch_id else None

        if stage_in_decls and not self._stage_ready(workdir):
            self._report_failure(payload, "stageIn requested but worker S3 client unavailable")
            return

        # Bind the job id for the log shipper so every record emitted from
        # here (stage-in, container stdout, stage-out, error traces) gets
        # written with the right `jobId`. Try/finally guarantees the reset
        # even if a stage step throws.
        token = current_job_id.set(job_id)
        try:
            # Every script (mounted or in-image) writes its outputs under
            # /work/out. Docker auto-creates only the bind-mount root (/work),
            # not subdirs, so ensure it exists for all jobs — mounted Warhol
            # scripts have no stage-in step to create it.
            if workdir:
                os.makedirs(os.path.join(workdir, "out"), exist_ok=True)

            # Bytes pulled in for this job — DPMC's `ingress` concern. Stays 0
            # when the script fetches its own inputs (the dpmc_io contract),
            # which is why cAdvisor's pod counters take precedence over this
            # when they are available.
            stage_in_bytes = 0

            if stage_in_decls and workdir:
                try:
                    entries = [
                        StageInEntry(
                            url=e.get("url"),
                            content=e.get("content"),
                            local_name=e["localName"],
                            role=e.get("role"),
                        )
                        for e in stage_in_decls
                    ]
                    stage_in_bytes = stage_in(self._s3, entries, workdir)
                except Exception as exc:
                    log.exception("stage-in failed for job %s", job_id)
                    self._report_failure(payload, f"stage-in failed: {exc}")
                    return

            try:
                run_start = time.monotonic()
                result = backend.run(
                    job_id,
                    dispatch,
                    lambda line: log.info("[job %s] %s", job_id, line),
                )
                wall_seconds = time.monotonic() - run_start
            except Exception as exc:
                log.exception("Backend run failed for job %s", job_id)
                self._report_failure(payload, str(exc))
                return

            status = "Success" if result.exit_code == 0 else "Failed"
            avg_power = self._estimate_avg_power(result.cpu_seconds, wall_seconds)

            self._stage_out_and_report(
                job_id=job_id,
                status=status,
                stage_out_decls=stage_out_decls,
                workdir=workdir,
                result=result,
                avg_power=avg_power,
                stage_in_bytes=stage_in_bytes,
            )
        finally:
            current_job_id.reset(token)
            # Only staged flows are self-contained (inputs/outputs in S3);
            # legacy bind-mount flows share the dir with downstream batches.
            if workdir and stage_in_decls and not KEEP_WORKDIR:
                shutil.rmtree(workdir, ignore_errors=True)
        return

    def _stage_out_and_report(
        self,
        *,
        job_id: int,
        status: str,
        stage_out_decls: list[dict[str, Any]],
        workdir: str | None,
        result: Any,
        avg_power: float | None,
        stage_in_bytes: int = 0,
    ) -> None:
        """Upload outputs (if success) then report metrics. Tail end of the
        run lifecycle; extracted so the surrounding `current_job_id` scope
        in `_execute` stays linear and the reset is unconditional.
        """
        # Stage-out only on success: a failing run might have produced
        # partial / unreadable outputs we don't want to publish.
        published: list[StageOutResult] = []
        if status == "Success" and stage_out_decls and workdir and self._stage_ready(workdir):
            try:
                entries = [
                    StageOutEntry(
                        key=e["key"],
                        local_name=e["localName"],
                        role=e.get("role"),
                        content_type=e.get("contentType"),
                    )
                    for e in stage_out_decls
                ]
                published = stage_out(self._s3, self._s3_bucket, entries, workdir)
            except Exception:
                log.exception("stage-out failed for job %s — job stays Success", job_id)

        if published:
            try:
                output_reports = []
                for p in published:
                    item: dict[str, Any] = {
                        "role": p.role,
                        "localName": p.local_name,
                        "key": p.key,
                        "size": p.size,
                    }
                    if p.local_name.endswith(".json") and workdir:
                        local_path = os.path.join(workdir, p.local_name)
                        if os.path.exists(local_path):
                            try:
                                with open(local_path, encoding="utf-8") as fh:
                                    item["content"] = json.load(fh)
                            except Exception:
                                log.warning("Could not read JSON content from %s", local_path)
                    output_reports.append(item)
                self._api.report_outputs(
                    self._host_id,
                    job_id,
                    output_reports,
                )
            except ApiError as exc:
                log.warning("report_outputs failed: %s", exc)

        try:
            self._api.report_result(
                self._host_id,
                job_id,
                {
                    "status": status,
                    "exitCode": result.exit_code,
                    "metrics": {
                        "cpuSeconds": result.cpu_seconds,
                        "avgPower": avg_power,
                        # Transfer volumes for the ingress/egress concerns.
                        # Strings: these are byte counts that overflow a JSON
                        # number's exact range on large productions.
                        "stageInBytes": str(stage_in_bytes),
                        "stageOutBytes": str(sum(p.size for p in published)),
                        "peakRssBytes": str(result.peak_rss_bytes) if result.peak_rss_bytes is not None else None,
                        "diskReadBytes": str(result.disk_read_bytes) if result.disk_read_bytes is not None else None,
                        "diskWriteBytes": str(result.disk_write_bytes) if result.disk_write_bytes is not None else None,
                    },
                },
            )
        except ApiError as exc:
            log.warning("report_result failed: %s", exc)

    def _stage_ready(self, workdir: str | None) -> bool:
        return bool(self._s3 and self._s3_bucket and workdir)

    @staticmethod
    def _estimate_avg_power(
        cpu_seconds: float | None, wall_seconds: float
    ) -> float | None:
        """Rough avg-power estimate: cpu_usage x per-core wattage.

        `cpu_seconds / wall_seconds` yields the mean number of cores busy
        over the job's wallclock duration (1.0 = one core at 100% the
        whole time, 4.0 = four cores at 100%, …). Multiplied by
        POWER_PER_CORE_W it gives a value the project_energy view can
        integrate with j.endedAt - j.startedAt to produce kWh.

        Fallback: short / lightweight jobs often expose cpu_seconds=0
        through Docker stats (the cgroup hasn't ticked yet). Returning
        None there would propagate as "no CO2 data" forever, even though
        the container did consume *some* power. Assume one busy core in
        that case so downstream rollups have a non-null floor.
        """
        if wall_seconds <= 0:
            return None
        if cpu_seconds is None or cpu_seconds <= 0:
            return POWER_PER_CORE_W
        return (cpu_seconds / wall_seconds) * POWER_PER_CORE_W

    def _report_failure(self, payload: dict[str, Any], message: str) -> None:
        try:
            self._api.report_result(
                self._host_id,
                payload["jobId"],
                {"status": "Failed", "exitCode": None, "errorMessage": message},
            )
        except ApiError as exc:
            log.warning("report_result (failure) failed: %s", exc)
