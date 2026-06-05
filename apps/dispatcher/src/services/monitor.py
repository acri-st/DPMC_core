"""Detect Running jobs whose host has gone silent and free their allocation."""

from __future__ import annotations

import logging

from domain.enums import JobStatus
from domain.retry import RetryPolicy
from repositories.jobs import retry_or_fail_job
from repositories.tables import T

log = logging.getLogger("dispatcher.monitor")


async def monitor_tick(db, lost_host_threshold_s: float, retry: RetryPolicy) -> int:
    """Run one tick. Returns the number of lost jobs handled.

    Each Running job on a silent host is run through the retry policy: it is
    either re-queued for another attempt or, once attempts are exhausted, left
    terminally Failed (with an operator escalation logged).
    """
    handled = 0
    retried = 0
    exhausted = 0
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
            outcome = await retry_or_fail_job(
                conn,
                job_id=r["id"],
                attempt=r["attempt"],
                allocation_id=r["alloc_id"],
                error="host lost",
                policy=retry,
            )
            handled += 1
            if outcome == "retried":
                retried += 1
            else:
                exhausted += 1
    if handled:
        log.warning(
            "monitor_tick: %d lost job(s) — %d retried, %d exhausted",
            handled, retried, exhausted,
        )
    return handled
