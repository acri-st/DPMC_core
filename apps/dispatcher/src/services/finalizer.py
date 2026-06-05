"""Roll batches & tasks to their terminal state when all jobs are done.

Background: the API's `recomputeBatchStatus` runs only when a worker reports
a job result. When the dispatcher skips a job (e.g. an OnFailure branch
whose parent succeeded), no worker is involved — so the batch stays
`pending` forever and the task never reaches `done`.

This tick fills that gap: every loop, scan batches whose jobs are all
terminal and seal them. Same for tasks whose batches are all terminal.
Idempotent; only acts on rows that need to move.
"""

from __future__ import annotations

import logging

from repositories.tables import T

log = logging.getLogger("dispatcher.finalizer")


async def finalizer_tick(db) -> int:
    """Run one pass. Returns the total number of batches+tasks finalized."""
    moved = 0
    async with db.tx() as conn:
        # 1) Finalize batches whose every job has reached a terminal job state.
        batch_cur = await conn.execute(
            f"""
            WITH jc AS (
              SELECT
                b.id AS batch_id,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE j.status IN ('success','failed','skipped','cancelled')) AS terminal,
                COUNT(*) FILTER (WHERE j.status = 'failed')    AS failed,
                COUNT(*) FILTER (WHERE j.status = 'cancelled') AS cancelled,
                COUNT(*) FILTER (WHERE j.status = 'success')   AS success
              FROM {T.BATCH} b
              JOIN {T.JOB} j ON j."batchId" = b.id
              WHERE b.status IN ('pending','running')
                AND b."deletedAt" IS NULL
              GROUP BY b.id
              HAVING COUNT(*) FILTER (
                WHERE j.status IN ('success','failed','skipped','cancelled')
              ) = COUNT(*)
            )
            UPDATE {T.BATCH} AS b
            SET status = CASE
              WHEN jc.failed > 0    THEN 'failed'::batch_status
              WHEN jc.cancelled > 0 THEN 'cancelled'::batch_status
              WHEN jc.success > 0   THEN 'success'::batch_status
              ELSE 'cancelled'::batch_status
            END,
            "endedAt" = NOW()
            FROM jc
            WHERE b.id = jc.batch_id
            RETURNING b.id, b.status, b."taskId"
            """
        )
        batch_rows = await batch_cur.fetchall()
        moved += len(batch_rows)
        for r in batch_rows:
            log.info("batch %s sealed → %s (skip-aware)", r["id"], r["status"])

        # 2) Finalize tasks whose every batch is terminal. Skip-induced
        #    Cancelled batches count as OK — they represent branches the
        #    DAG legitimately didn't take, not user-driven cancellations.
        task_cur = await conn.execute(
            f"""
            WITH bc AS (
              SELECT
                t.id AS task_id,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE b.status IN ('success','failed','cancelled')) AS terminal,
                COUNT(*) FILTER (WHERE b.status = 'failed') AS failed
              FROM {T.TASK} t
              JOIN {T.BATCH} b ON b."taskId" = t.id AND b."deletedAt" IS NULL
              WHERE t.status = 'running'
                AND t."deletedAt" IS NULL
              GROUP BY t.id
              HAVING COUNT(*) FILTER (
                WHERE b.status IN ('success','failed','cancelled')
              ) = COUNT(*)
            )
            UPDATE {T.TASK} AS t
            SET status = CASE
              WHEN bc.failed > 0 THEN 'error'::task_status
              ELSE 'done'::task_status
            END,
            "completedAt" = NOW()
            FROM bc
            WHERE t.id = bc.task_id
            RETURNING t.id, t.status
            """
        )
        task_rows = await task_cur.fetchall()
        moved += len(task_rows)
        for r in task_rows:
            log.info("task %s sealed → %s", r["id"], r["status"])

    return moved
