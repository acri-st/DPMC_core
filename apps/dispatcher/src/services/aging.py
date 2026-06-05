"""Recompute Job.effectivePriority for visibility."""

from __future__ import annotations

import logging
import time

from domain.dispatch import effective_priority
from domain.enums import JobStatus
from repositories.tables import T

log = logging.getLogger("dispatcher.aging")


async def aging_tick(db) -> int:
    """Run one tick. Returns the number of jobs whose effectivePriority was set."""
    updated = 0
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT j.id                                        AS id,
                   b.priority                                  AS priority,
                   b."priorityClass"                           AS class,
                   p."priorityWeight"                          AS project_weight,
                   (EXTRACT(EPOCH FROM j."createdAt") * 1000)::BIGINT AS ready_since_ms
            FROM {T.JOB} j
            JOIN {T.BATCH} b   ON b.id = j."batchId"
            JOIN {T.PROJECT} p ON p.id = j."projectId"
            WHERE j.status = %s
            """,
            (JobStatus.READY.value,),
        )
        rows = await cur.fetchall()
        if not rows:
            return 0

        now_ms = int(time.time() * 1000)
        for r in rows:
            eff = effective_priority(r, now_ms)
            await conn.execute(
                f'UPDATE {T.JOB} SET "effectivePriority" = %s WHERE id = %s',
                (eff, r["id"]),
            )
            updated += 1
    return updated
