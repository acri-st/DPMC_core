"""One-shot recovery on startup."""

from __future__ import annotations

import logging

from domain.enums import JobStatus
from repositories.jobs import fail_job_and_release_allocation
from repositories.tables import T

log = logging.getLogger("dispatcher.recovery")


async def recovery_once(
    db,
    *,
    lost_host_threshold_s: float,
) -> dict[str, int]:
    """Run startup recovery. Returns {'jobs_failed': m}."""
    jobs_failed = 0

    async with db.tx() as conn:
        # Wider window for orphan-on-restart jobs
        wide = lost_host_threshold_s * 2
        cur = await conn.execute(
            f"""
            SELECT j.id, a.id AS alloc_id
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
            await fail_job_and_release_allocation(
                conn,
                job_id=r["id"],
                allocation_id=r["alloc_id"],
                error="host lost (recovery)",
            )
            jobs_failed += 1

    if jobs_failed:
        log.warning("recovery_once marked %d orphan Running jobs as Failed", jobs_failed)

    return {"jobs_failed": jobs_failed}
