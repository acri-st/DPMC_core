"""Reusable job-aggregate SQL operations shared by multiple services."""

from __future__ import annotations

from domain.enums import JobStatus

from .tables import T


async def fail_job_and_release_allocation(
    conn,
    *,
    job_id: int,
    allocation_id: int | None,
    error: str,
    increment_attempt: bool = False,
) -> None:
    """Mark `job_id` as Failed (optionally bumping `attempt`) and release
    the matching JobAllocation row, if any.

    Both monitor (host went silent) and recovery (orphan after restart)
    services need this exact sequence.
    """
    if increment_attempt:
        await conn.execute(
            f'UPDATE {T.JOB} '
            f'SET status = %s, "lastError" = %s, attempt = attempt + 1, "endedAt" = NOW() '
            f'WHERE id = %s',
            (JobStatus.FAILED.value, error, job_id),
        )
    else:
        await conn.execute(
            f'UPDATE {T.JOB} '
            f'SET status = %s, "lastError" = %s, "endedAt" = NOW() '
            f'WHERE id = %s',
            (JobStatus.FAILED.value, error, job_id),
        )

    if allocation_id is not None:
        await conn.execute(
            f'UPDATE {T.JOB_ALLOCATION} SET "releasedAt" = NOW() WHERE id = %s',
            (allocation_id,),
        )
