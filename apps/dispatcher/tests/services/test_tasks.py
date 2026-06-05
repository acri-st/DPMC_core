from __future__ import annotations

import pytest

from services.tasks import task_tick

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_task_tick_promotes_runnable_tasks() -> None:
    conn = ScriptedConn([
        [
            {"id": 1, "status": "queued", "scheduled_start_time_ms": 0},
            {"id": 2, "status": "queued", "scheduled_start_time_ms": 10**18},
        ],
    ])
    db = FakeDb(conn)
    calls: list[int] = []

    async def expand(task_id: int) -> None:
        calls.append(task_id)

    promoted = await task_tick(db, expand)

    assert promoted == 1
    assert calls == [1]
    assert any("UPDATE" in sql.upper() for sql, _ in conn.updates)


@pytest.mark.asyncio
async def test_task_tick_skips_when_expand_raises_not_implemented() -> None:
    conn = ScriptedConn([
        [{"id": 1, "status": "queued", "scheduled_start_time_ms": 0}],
    ])
    db = FakeDb(conn)

    async def expand(_task_id: int) -> None:
        raise NotImplementedError("stub")

    promoted = await task_tick(db, expand)

    assert promoted == 0
    assert conn.updates == []
