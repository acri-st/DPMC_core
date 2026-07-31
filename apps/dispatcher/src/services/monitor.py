"""Detect Running jobs whose host has gone silent and free their allocation."""

from __future__ import annotations

import logging

from domain.enums import JobStatus
from repositories.jobs import fail_job_and_release_allocation
from repositories.tables import T

log = logging.getLogger("dispatcher.monitor")


async def monitor_tick(db, lost_host_threshold_s: float) -> int:
    """Run one tick. Returns the number of jobs marked Failed."""
    failed = 0
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT j.id, j."attempt", a.id AS alloc_id
            FROM {T.JOB} j
            JOIN {T.HOST} h           ON h.id = j."hostId"
            LEFT JOIN {T.JOB_ALLOCATION} a ON a."jobId" = j.id AND a."releasedAt" IS NULL
            WHERE j.status = %s
              AND (h."lastHeartbeatAt" IS NULL
                   OR h."lastHeartbeatAt" < NOW() - (%s || ' seconds')::interval)
            """,
            (JobStatus.RUNNING.value, str(lost_host_threshold_s)),
        )
        rows = await cur.fetchall()
        for r in rows:
            await fail_job_and_release_allocation(
                conn,
                job_id=r["id"],
                allocation_id=r["alloc_id"],
                error="host lost",
                increment_attempt=True,
            )
            failed += 1
    if failed:
        log.warning("monitor_tick marked %d jobs Failed", failed)
    return failed
