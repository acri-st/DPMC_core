"""Pure dependency-resolution logic for the dispatcher."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence

from .enums import DependencyMode, JobStatus, is_terminal_job_status


def next_state_for_child(
    parents_by_mode: Mapping[str, Sequence[tuple[int, str]]],
    *,
    data_available: Callable[[int], bool] | None = None,
) -> str:
    """Decide the next status for a Waiting child job.

    `parents_by_mode` maps a DependencyMode (`on_success`, `on_failure`,
    `on_completion`, `optional`, `on_data_available`) to the list of
    `(parent_id, parent_status)` pairs reaching this child via that mode.

    For `on_data_available`, entries are `(productTypeId, "data")` tuples
    and the optional `data_available` predicate is called with each
    productTypeId. When no predicate is provided, the child conservatively
    stays `waiting`.

    Returns one of: `ready`, `waiting`, `skipped` (snake_case literals
    matching the `job_status` Postgres enum).

    Decision algorithm: every mode must independently pass. If any mode
    contradicts (parent reached a terminal state incompatible with the
    expected one), the child is `skipped`. If any mode is still
    in-progress, the child stays `waiting`. Otherwise `ready`.
    """
    if not parents_by_mode:
        return JobStatus.READY

    state: str = JobStatus.READY
    for mode, parents in parents_by_mode.items():
        statuses = [s for _, s in parents]

        if mode == DependencyMode.ON_SUCCESS:
            if all(s == JobStatus.SUCCESS for s in statuses):
                continue
            if any(s in {JobStatus.FAILED, JobStatus.SKIPPED, JobStatus.CANCELLED} for s in statuses):
                return JobStatus.SKIPPED
            state = JobStatus.WAITING
        elif mode == DependencyMode.ON_FAILURE:
            if any(s == JobStatus.FAILED for s in statuses):
                continue
            if all(is_terminal_job_status(s) for s in statuses):
                return JobStatus.SKIPPED
            state = JobStatus.WAITING
        elif mode == DependencyMode.ON_COMPLETION:
            if all(is_terminal_job_status(s) for s in statuses):
                continue
            state = JobStatus.WAITING
        elif mode == DependencyMode.OPTIONAL:
            continue
        elif mode == DependencyMode.ON_DATA_AVAILABLE:
            if data_available is None:
                state = JobStatus.WAITING
                continue
            ids = [pid for pid, _ in parents]
            if all(data_available(pid) for pid in ids):
                continue
            state = JobStatus.WAITING
        else:
            # Unknown mode — fail safe by leaving the job Waiting.
            state = JobStatus.WAITING

    return state
