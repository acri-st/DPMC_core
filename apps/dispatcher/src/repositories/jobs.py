"""Reusable job-aggregate SQL operations shared by multiple services."""

from __future__ import annotations

import logging

from domain.enums import JobStatus
from domain.retry import RetryPolicy

from .tables import T

log = logging.getLogger("dispatcher.jobs")


async def _release_allocation(conn, allocation_id: int | None) -> None:
    if allocation_id is not None:
        await conn.execute(
            f'UPDATE {T.JOB_ALLOCATION} SET "releasedAt" = NOW() WHERE id = %s',
            (allocation_id,),
        )


async def retry_or_fail_job(
    conn,
    *,
    job_id: int,
    attempt: int,
    allocation_id: int | None,
    error: str,
    policy: RetryPolicy,
) -> str:
    """Apply the retry policy to a job that failed for an infrastructure reason.

    `attempt` is the job's CURRENT attempt count (before this failure). The
    failure bumps it to `attempt + 1`; if that still leaves the job under
    `policy.max_attempts` it is re-queued to Ready with an exponential backoff
    (`expectedStartTime` set in the future, which `dispatch` honours) and its
    run-state (host/pid/timestamps) is cleared so it can be allocated afresh.
    Otherwise it is left terminally Failed and an operator escalation is
    logged.

    The job's allocation is always released. Both the `monitor` loop (host
    went silent) and startup `recovery` (orphan after restart) go through
    here. Returns ``"retried"`` or ``"exhausted"``.
    """
    new_attempt = attempt + 1
    await _release_allocation(conn, allocation_id)

    if policy.should_retry(new_attempt):
        delay_s = policy.backoff_for(new_attempt)
        await conn.execute(
            f"""
            UPDATE {T.JOB}
            SET status = %s,
                "lastError" = %s,
                attempt = %s,
                "expectedStartTime" = NOW() + (%s || ' seconds')::interval,
                "hostId" = NULL,
                pid = NULL,
                "startedAt" = NULL,
                "endedAt" = NULL
            WHERE id = %s
            """,
            (JobStatus.READY.value, error, new_attempt, str(delay_s), job_id),
        )
        log.info(
            "job %s failed (%s) — retry %d/%d scheduled in %.0fs",
            job_id, error, new_attempt, policy.max_attempts, delay_s,
        )
        return "retried"

    await conn.execute(
        f"""
        UPDATE {T.JOB}
        SET status = %s, "lastError" = %s, attempt = %s, "endedAt" = NOW()
        WHERE id = %s
        """,
        (
            JobStatus.FAILED.value,
            f"{error} (retries exhausted after {new_attempt} attempt(s))",
            new_attempt,
            job_id,
        ),
    )
    log.error(
        "RETRY EXHAUSTED job=%s attempts=%d/%d lastError=%r — "
        "operator attention required",
        job_id, new_attempt, policy.max_attempts, error,
    )
    return "exhausted"
