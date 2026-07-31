"""Domain-level enum types matching the Postgres `*_status`, `*_kind`,
`*_mode` enums managed by Prisma.

Each member's `.value` is the snake_case literal stored in the database,
which lets the same constant be used both for in-process logic and as a
psycopg parameter without translation.
"""

from __future__ import annotations

from enum import StrEnum


class JobStatus(StrEnum):
    WAITING = "waiting"
    READY = "ready"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class TaskStatus(StrEnum):
    EDITED = "edited"
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"
    SUSPENDED = "suspended"


class BatchKind(StrEnum):
    CHAIN = "chain"
    STANDALONE = "standalone"


class HostStatus(StrEnum):
    UP = "up"
    BUSY = "busy"
    OFF = "off"
    MAINTENANCE = "maintenance"


class ContainerRuntime(StrEnum):
    DOCKER = "docker"
    APPTAINER = "apptainer"
    KUBERNETES = "kubernetes"
    NONE = "none"


# What a host capability satisfies, keyed by the script's required runtime.
# A Docker requirement (OCI image) is met by a native Docker daemon OR a
# Kubernetes cluster; Apptainer (SIF) is met only by Apptainer.
_RUNTIME_SATISFIED_BY: dict[ContainerRuntime, frozenset[ContainerRuntime]] = {
    ContainerRuntime.DOCKER: frozenset(
        {ContainerRuntime.DOCKER, ContainerRuntime.KUBERNETES}
    ),
    ContainerRuntime.APPTAINER: frozenset({ContainerRuntime.APPTAINER}),
}


def runtime_satisfies(host_runtime: str, need_runtime: str) -> bool:
    """True when a host with *host_runtime* can run a job needing *need_runtime*.

    ``NONE`` as a requirement accepts any host (the script imposes no runtime).
    Otherwise the host capability must be in the requirement's satisfied-by set,
    so a Kubernetes host transparently serves Docker (OCI) workloads.
    """
    if need_runtime == ContainerRuntime.NONE:
        return True
    try:
        need = ContainerRuntime(need_runtime)
    except ValueError:
        return host_runtime == need_runtime
    return host_runtime in _RUNTIME_SATISFIED_BY.get(need, frozenset({need}))


class ProductionMode(StrEnum):
    NOMINAL = "nominal"
    TEST = "test"
    REPROCESSING = "reprocessing"
    ON_DEMAND = "on_demand"
    ON_THE_FLY = "on_the_fly"
    HPC = "hpc"
    GENERIC = "generic"


class PriorityClass(StrEnum):
    TEST = "test"
    ON_DEMAND = "on_demand"
    REPROCESSING = "reprocessing"
    NRT = "nrt"
    SUPER = "super"
    ULTRA = "ultra"


class ProductionChainKind(StrEnum):
    STANDARD = "standard"
    WATCHER = "watcher"


class DependencyMode(StrEnum):
    ON_SUCCESS = "on_success"
    ON_FAILURE = "on_failure"
    ON_COMPLETION = "on_completion"
    ON_DATA_AVAILABLE = "on_data_available"
    OPTIONAL = "optional"


_TERMINAL_JOB_STATUSES: frozenset[JobStatus] = frozenset({
    JobStatus.SUCCESS,
    JobStatus.FAILED,
    JobStatus.SKIPPED,
    JobStatus.CANCELLED,
})


def is_terminal_job_status(status: str) -> bool:
    """True iff the given status string is a terminal job state."""
    return status in _TERMINAL_JOB_STATUSES
