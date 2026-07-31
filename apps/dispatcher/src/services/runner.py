"""Compose every dispatcher service into one async runner."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from config import DispatcherConfig
from infrastructure.api_client import expand_task_via_api, wait_for_api_ready
from infrastructure.db import Db
from infrastructure.heartbeat import SchedulerHeartbeat
from repositories.tables import T

from .aging import aging_tick
from .dependency import dep_tick
from .dispatch import dispatch_tick
from .finalizer import finalizer_tick
from .monitor import monitor_tick
from .recovery import recovery_once
from .tasks import task_tick
from .watcher import watcher_tick

log = logging.getLogger("dispatcher.runner")


async def _ticker(
    name: str,
    fn: Callable[[], Awaitable[int]],
    interval: float,
) -> None:
    while True:
        try:
            n = await fn()
            if n:
                log.debug("[%s] tick: %d action(s)", name, n)
        except Exception:
            log.exception("[%s] tick failed", name)
        await asyncio.sleep(interval)


async def _query_stats(db) -> dict[str, int]:
    """Snapshot the dispatcher's view of the world (counts only)."""
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT
              (SELECT COUNT(*) FROM {T.TASK} WHERE status = 'queued'  AND "deletedAt" IS NULL) AS task_queued,
              (SELECT COUNT(*) FROM {T.TASK} WHERE status = 'running' AND "deletedAt" IS NULL) AS task_running,
              (SELECT COUNT(*) FROM {T.JOB}  WHERE status = 'waiting') AS job_waiting,
              (SELECT COUNT(*) FROM {T.JOB}  WHERE status = 'ready')   AS job_ready,
              (SELECT COUNT(*) FROM {T.JOB}  WHERE status = 'running') AS job_running,
              (SELECT COUNT(*) FROM {T.HOST} WHERE status = 'up')      AS host_up,
              (SELECT COUNT(*) FROM {T.HOST} WHERE status = 'busy')    AS host_busy,
              (SELECT COUNT(*) FROM {T.HOST} WHERE status = 'off')     AS host_off
            """
        )
        rows = await cur.fetchall()
        return {k: int(v) for k, v in dict(rows[0]).items()}


async def _heartbeat_loop(db, hb: SchedulerHeartbeat, interval_s: float) -> None:
    """Periodically send a heartbeat to the API with real queue/running counts."""
    while True:
        try:
            stats = await _query_stats(db)
            await hb.maybe_send(
                queue_depth=stats["job_ready"] + stats["job_waiting"],
                running_count=stats["job_running"],
            )
        except Exception:
            log.exception("heartbeat loop failed")
        await asyncio.sleep(interval_s)


async def _metrics_loop(db, interval_s: float) -> None:
    """Periodically log a one-line snapshot of dispatcher state.

    Gives operators a steady signal of what the dispatcher sees, replacing
    the per-request httpx noise that previously dominated the log.
    """
    while True:
        try:
            s = await _query_stats(db)
            log.info(
                "state tasks(queued=%d running=%d) jobs(waiting=%d ready=%d running=%d) hosts(up=%d busy=%d off=%d)",
                s["task_queued"], s["task_running"],
                s["job_waiting"], s["job_ready"], s["job_running"],
                s["host_up"], s["host_busy"], s["host_off"],
            )
        except Exception:
            log.exception("metrics loop failed")
        await asyncio.sleep(interval_s)


async def run_all(cfg: DispatcherConfig) -> None:
    await wait_for_api_ready(cfg.api_url, ssl_verify=cfg.api_ssl_verify)

    db = Db(cfg.database_url)
    await db.connect()
    try:
        if cfg.recovery_on_startup:
            try:
                summary = await recovery_once(
                    db,
                    lost_host_threshold_s=cfg.monitor_lost_host_threshold_s,
                )
                log.info("recovery_once: %s", summary)
            except Exception:
                log.exception("recovery_once failed")

        async def _expand(task_id: int) -> None:
            await expand_task_via_api(cfg.api_url, cfg.api_token, task_id, ssl_verify=cfg.api_ssl_verify)

        heartbeat = SchedulerHeartbeat(cfg.api_url, cfg.api_token, ssl_verify=cfg.api_ssl_verify)

        await asyncio.gather(
            _ticker("task",       lambda: task_tick(db, _expand),                              cfg.task_loop_interval_s),
            _ticker("dependency", lambda: dep_tick(db),                                        cfg.dependency_loop_interval_s),
            _ticker("dispatch",   lambda: dispatch_tick(db),                                   cfg.dispatch_loop_interval_s),
            _ticker("monitor",    lambda: monitor_tick(db, cfg.monitor_lost_host_threshold_s), cfg.monitor_loop_interval_s),
            _ticker("aging",      lambda: aging_tick(db),                                      cfg.aging_loop_interval_s),
            _ticker("watcher",    lambda: watcher_tick(db),                                    cfg.watcher_loop_interval_s),
            _ticker("finalizer",  lambda: finalizer_tick(db),                                  cfg.finalizer_loop_interval_s),
            _heartbeat_loop(db, heartbeat, cfg.heartbeat_interval_s),
            _metrics_loop(db, cfg.metrics_loop_interval_s),
        )
    finally:
        await db.close()
