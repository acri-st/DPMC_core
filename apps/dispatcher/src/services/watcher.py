"""Periodically create Tasks for ProductionChains of kind = 'watcher'.

The watcher chain's processing scripts are responsible for deciding what
follow-up actions to take; this loop just ensures the chain runs at most
once per `watcherConfig.intervalSeconds` (default: every tick).
"""

from __future__ import annotations

import logging
from uuid import uuid4

from domain.enums import (
    BatchKind,
    PriorityClass,
    ProductionChainKind,
    ProductionMode,
    TaskStatus,
)
from repositories.tables import T

log = logging.getLogger("dispatcher.watcher")


async def watcher_tick(db) -> int:
    """Run one tick. Returns the number of watcher tasks created."""
    created = 0
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT pc.id          AS chain_id,
                   pc."watcherConfig" AS watcher_config
            FROM {T.PRODUCTION_CHAIN} pc
            WHERE pc.kind = %s
              AND pc."isActive" = TRUE
              AND pc."deletedAt" IS NULL
            """,
            (ProductionChainKind.WATCHER.value,),
        )
        chains = await cur.fetchall()
        if not chains:
            return 0

        # For each watcher chain, find or pick a project. v1: use the first
        # project that allows the 'generic' production mode.
        project_cur = await conn.execute(
            f"""
            SELECT id FROM {T.PROJECT}
            WHERE "deletedAt" IS NULL AND %s::production_mode = ANY("allowedProductionModes")
            LIMIT 1
            """,
            (ProductionMode.GENERIC.value,),
        )
        project_rows = await project_cur.fetchall()
        if not project_rows:
            log.warning("watcher_tick: no eligible project, skipping")
            return 0
        project_id = project_rows[0]["id"]

        # Skip a chain if a Watcher Task is still Queued or Running for it.
        for ch in chains:
            existing_cur = await conn.execute(
                f"""
                SELECT 1 FROM {T.TASK}
                WHERE "productionChainId" = %s
                  AND status = ANY(%s::task_status[])
                  AND "deletedAt" IS NULL
                LIMIT 1
                """,
                (
                    ch["chain_id"],
                    [TaskStatus.QUEUED.value, TaskStatus.RUNNING.value],
                ),
            )
            existing = await existing_cur.fetchall()
            if existing:
                continue

            execution_tag = str(uuid4())
            await conn.execute(
                f"""
                INSERT INTO {T.TASK} (
                  "projectId", kind, "productionChainId",
                  "executionTag", status, "scheduledStartTime",
                  priority, "productionMode", "priorityClass",
                  "createdAt", "updatedAt"
                ) VALUES (
                  %s, %s, %s, %s, %s, NOW(),
                  0, %s, %s, NOW(), NOW()
                )
                """,
                (
                    project_id,
                    BatchKind.CHAIN.value,
                    ch["chain_id"],
                    execution_tag,
                    TaskStatus.QUEUED.value,
                    ProductionMode.GENERIC.value,
                    PriorityClass.ON_DEMAND.value,
                ),
            )
            created += 1

    if created:
        log.info("watcher_tick created %d tasks", created)
    return created
