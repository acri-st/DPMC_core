"""Execution backend interface (Docker, Apptainer, ...)."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass


@dataclass
class BackendMount:
    source: str
    target: str
    read_only: bool = False


@dataclass
class BackendDispatch:
    image: str | None
    command: Sequence[str]
    env: Mapping[str, str]
    mounts: Sequence[BackendMount]
    cpus: float
    memory_bytes: int
    gpus: Sequence[int]


@dataclass
class BackendResult:
    exit_code: int
    cpu_seconds: float | None = None
    peak_rss_bytes: int | None = None
    disk_read_bytes: int | None = None
    disk_write_bytes: int | None = None


class ExecutionBackend:
    name: str = "base"

    def run(
        self,
        job_id: int,
        dispatch: BackendDispatch,
        log_sink: Callable[[str], None],
    ) -> BackendResult:
        raise NotImplementedError

    def cancel(self, job_id: int) -> None:
        raise NotImplementedError
