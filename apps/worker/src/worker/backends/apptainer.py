"""Apptainer execution backend (shells out to the `apptainer` CLI)."""

from __future__ import annotations

import logging
import subprocess
import time
from collections.abc import Callable

from .base import BackendDispatch, BackendResult, ExecutionBackend

log = logging.getLogger("worker.backends.apptainer")


class ApptainerBackend(ExecutionBackend):
    name = "Apptainer"

    def run(
        self,
        job_id: int,
        dispatch: BackendDispatch,
        log_sink: Callable[[str], None],
    ) -> BackendResult:
        if dispatch.image is None:
            raise ValueError("ApptainerBackend requires an image")

        cmd: list[str] = [
            "apptainer", "exec", "--containall",
        ]
        for k, v in dispatch.env.items():
            cmd += ["--env", f"{k}={v}"]
        for m in dispatch.mounts:
            spec = f"{m.source}:{m.target}"
            if m.read_only:
                spec += ":ro"
            cmd += ["--bind", spec]
        if dispatch.gpus:
            cmd += ["--nv"]
        # Apptainer has no first-class --cpus / --memory limit. We log a warning
        # so operators know the limit is not enforced by the runtime in this mode.
        if dispatch.cpus or dispatch.memory_bytes:
            log.warning(
                "Apptainer does not enforce --cpus/--memory limits; resources are advisory (job=%s)",
                job_id,
            )
        cmd += [dispatch.image]
        cmd += list(dispatch.command)

        start = time.monotonic()
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        if proc.stdout is not None:
            for line in proc.stdout:
                log_sink(line.rstrip())
        proc.wait()
        elapsed = time.monotonic() - start

        return BackendResult(
            exit_code=proc.returncode,
            cpu_seconds=elapsed,
        )

    def cancel(self, job_id: int) -> None:
        # Apptainer instances are tracked separately; we use process group kill via
        # `apptainer instance stop <name>` if the job ran as a named instance.
        # For exec'd runs there's no built-in cancel; rely on container exit.
        log.info("Apptainer cancel requested for %s (no-op for exec mode)", job_id)
