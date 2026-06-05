"""Docker execution backend (shells out to the `docker` CLI)."""

from __future__ import annotations

import logging
import subprocess
import threading
import time
from collections.abc import Callable

from worker.sampling import (
    clock_ticks_per_second,
    sample_cpu,
    sample_io,
    sample_rss_bytes,
)

from .base import BackendDispatch, BackendResult, ExecutionBackend

log = logging.getLogger("worker.backends.docker")
_SAMPLE_INTERVAL_S = 5.0


class _Aggregate:
    def __init__(self) -> None:
        self.cpu_ticks_max = 0
        self.peak_rss_bytes: int | None = None
        self.last_io_read = 0
        self.last_io_write = 0


def _resolve_pid(job_id: int) -> int | None:
    try:
        out = subprocess.run(
            ["docker", "inspect", "--format={{.State.Pid}}", f"dpmc-{job_id}"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        ).stdout.strip()
        return int(out) if out and out != "0" else None
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError):
        return None


def _sampler_loop(job_id: int, agg: _Aggregate, stop: threading.Event) -> None:
    pid: int | None = None
    while not stop.is_set():
        if pid is None:
            pid = _resolve_pid(job_id)
        if pid is not None:
            cpu = sample_cpu(pid)
            if cpu is not None and cpu.total_ticks > agg.cpu_ticks_max:
                agg.cpu_ticks_max = cpu.total_ticks
            rss = sample_rss_bytes(pid)
            if rss is not None and (agg.peak_rss_bytes is None or rss > agg.peak_rss_bytes):
                agg.peak_rss_bytes = rss
            io = sample_io(pid)
            if io is not None:
                agg.last_io_read = io.read_bytes
                agg.last_io_write = io.write_bytes
        stop.wait(_SAMPLE_INTERVAL_S)


class DockerBackend(ExecutionBackend):
    name = "Docker"

    def run(
        self,
        job_id: int,
        dispatch: BackendDispatch,
        log_sink: Callable[[str], None],
    ) -> BackendResult:
        if dispatch.image is None:
            raise ValueError("DockerBackend requires an image")

        cmd: list[str] = [
            "docker", "run", "--rm",
            "--name", f"dpmc-{job_id}",
            "--cpus", str(dispatch.cpus),
            "--memory", str(dispatch.memory_bytes),
            # Mirror the worker compose extra_hosts so scripts can reach the
            # API + S3 via host.docker.internal in dev.
            "--add-host", "host.docker.internal:host-gateway",
        ]
        for k, v in dispatch.env.items():
            cmd += ["-e", f"{k}={v}"]
        for m in dispatch.mounts:
            spec = f"{m.source}:{m.target}"
            if m.read_only:
                spec += ":ro"
            cmd += ["-v", spec]
        for gpu in dispatch.gpus:
            cmd += ["--gpus", f'"device={gpu}"']
        cmd += [dispatch.image]
        cmd += list(dispatch.command)

        agg = _Aggregate()
        stop = threading.Event()
        sampler = threading.Thread(
            target=_sampler_loop,
            args=(job_id, agg, stop),
            name=f"dpmc-sampler-{job_id}",
            daemon=True,
        )

        start = time.monotonic()
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        sampler.start()
        if proc.stdout is not None:
            for line in proc.stdout:
                log_sink(line.rstrip())
        proc.wait()
        elapsed = time.monotonic() - start
        stop.set()
        sampler.join(timeout=2.0)

        clk = clock_ticks_per_second()
        cpu_seconds = agg.cpu_ticks_max / clk if clk > 0 else None

        return BackendResult(
            exit_code=proc.returncode,
            cpu_seconds=cpu_seconds if cpu_seconds is not None else elapsed,
            peak_rss_bytes=agg.peak_rss_bytes,
            disk_read_bytes=agg.last_io_read or None,
            disk_write_bytes=agg.last_io_write or None,
        )

    def cancel(self, job_id: int) -> None:
        subprocess.run(
            ["docker", "kill", f"dpmc-{job_id}"],
            check=False,
            capture_output=True,
        )
