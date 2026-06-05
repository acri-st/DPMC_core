"""One-shot recovery on startup."""

from __future__ import annotations

import logging

from domain.enums import JobStatus
from domain.retry import RetryPolicy
from repositories.jobs import retry_or_fail_job
from repositories.tables import T

log = logging.getLogger("dispatcher.recovery")


async def recovery_once(
    db,
    *,
    lost_host_threshold_s: float,
    retry: RetryPolicy,
) -> dict[str, int]:
    """Run startup recovery.

    Orphan Running jobs left behind by a crash (their host is silent) are run
    through the same retry policy as the live `monitor` loop. Returns
    ``{'jobs_retried': r, 'jobs_exhausted': e}``.
    """
    retried = 0
    exhausted = 0

    async with db.tx() as conn:
        # Wider window for orphan-on-restart jobs
        wide = lost_host_threshold_s * 2
        cur = await conn.execute(
            f"""
            SELECT j.id, j."attempt", a.id AS alloc_id
            FROM {T.JOB} j
            JOIN {T.JOB_ALLOCATION} a ON a."jobId" = j.id AND a."releasedAt" IS NULL
            JOIN {T.HOST} h          ON h.id = a."hostId"
            WHERE j.status = %s
              AND (h."lastHeartbeatAt" IS NULL
                   OR h."lastHeartbeatAt" < NOW() - (%s || ' seconds')::interval)
            """,
            (JobStatus.RUNNING.value, str(wide)),
        )
        rows = await cur.fetchall()
        for r in rows:
            outcome = await retry_or_fail_job(
                conn,
                job_id=r["id"],
                attempt=r["attempt"],
                allocation_id=r["alloc_id"],
                error="host lost (recovery)",
                policy=retry,
            )
            if outcome == "retried":
                retried += 1
            else:
                exhausted += 1

    total = retried + exhausted
    if total:
        log.warning(
            "recovery_once: %d orphan Running job(s) — %d retried, %d exhausted",
            total, retried, exhausted,
        )

    return {"jobs_retried": retried, "jobs_exhausted": exhausted}
