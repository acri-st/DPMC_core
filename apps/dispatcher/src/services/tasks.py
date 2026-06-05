"""Promote Queued tasks past their scheduledStartTime to Running."""

from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable

from domain.enums import TaskStatus
from domain.tasks import select_runnable_task_ids
from repositories.tables import T

log = logging.getLogger("dispatcher.tasks")

ExpandFn = Callable[[int], Awaitable[None]]


async def task_tick(db, expand: ExpandFn) -> int:
    """Run one tick of the task service. Returns number of promoted tasks.

    `db` is a `infrastructure.db.Db` (or a fake exposing `tx()`).
    `expand` is an async callable taking a task id; in production this is
    `infrastructure.api_client.expand_task_via_api` partially applied with
    config.
    """
    promoted = 0
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT id,
                   status,
                   (EXTRACT(EPOCH FROM "scheduledStartTime") * 1000)::BIGINT
                       AS scheduled_start_time_ms
            FROM {T.TASK}
            WHERE status = %s AND "deletedAt" IS NULL
            FOR UPDATE SKIP LOCKED
            """,
            (TaskStatus.QUEUED.value,),
        )
        rows = await cur.fetchall()
        runnable = select_runnable_task_ids(rows, int(time.time() * 1000))
    # Lock released here: we must not hold a FOR UPDATE row lock across the
    # expand HTTP call, otherwise the API's INSERT INTO batch (which needs a
    # SHARE lock on the parent Task row via FK) blocks waiting on us while we
    # block waiting on it — deadlock until httpx times out.

    if rows and not runnable:
        log.debug("task_tick: %d queued task(s), none past scheduledStartTime", len(rows))

    for tid in runnable:
        try:
            await expand(tid)
        except NotImplementedError as exc:
            log.warning("expand stub for task %s: %s — leaving as Queued", tid, exc)
            continue
        except Exception:
            log.exception("expand failed for task %s", tid)
            continue
        async with db.tx() as conn:
            await conn.execute(
                f'UPDATE {T.TASK} SET status = %s, "startedAt" = NOW() WHERE id = %s',
                (TaskStatus.RUNNING.value, tid),
            )
        promoted += 1
        log.info("task %s queued → running (expanded)", tid)
    return promoted
