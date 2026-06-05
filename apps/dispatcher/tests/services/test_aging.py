from __future__ import annotations

import pytest

from services.aging import aging_tick

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_aging_tick_writes_effective_priority_for_each_ready_job():
    conn = ScriptedConn([
        [
            {"id": 1, "priority": 5, "class": "nrt", "project_weight": 1.0, "ready_since_ms": 0},
            {"id": 2, "priority": 1, "class": "on_demand", "project_weight": 1.0, "ready_since_ms": 0},
        ],
    ])
    db = FakeDb(conn)
    assert await aging_tick(db) == 2
    assert len(conn.updates) == 2


@pytest.mark.asyncio
async def test_aging_tick_no_ready_jobs():
    conn = ScriptedConn([[]])
    db = FakeDb(conn)
    assert await aging_tick(db) == 0
