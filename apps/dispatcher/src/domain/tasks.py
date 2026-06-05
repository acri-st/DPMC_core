"""Pure logic for selecting which Task rows are due to run.

Separated from DB code so it stays trivially unit-testable.
"""

from __future__ import annotations

from collections.abc import Iterable

from .enums import TaskStatus


def select_runnable_task_ids(
    rows: Iterable[dict],
    now_ms: int,
) -> list[int]:
    return [
        r["id"]
        for r in rows
        if r["status"] == TaskStatus.QUEUED
        and r["scheduled_start_time_ms"] <= now_ms
    ]
