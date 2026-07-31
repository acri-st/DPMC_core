from __future__ import annotations

import pytest

from services.monitor import monitor_tick

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_monitor_tick_marks_lost_jobs_failed():
    conn = ScriptedConn([
        [{"id": 1, "attempt": 0, "alloc_id": 1}],
    ])
    db = FakeDb(conn)
    failed = await monitor_tick(db, 60.0)
    assert failed == 1
    assert any('UPDATE "job"' in u[0] for u in conn.updates)
    assert any('"job_x_allocation"' in u[0] for u in conn.updates)


@pytest.mark.asyncio
async def test_monitor_tick_no_lost_jobs():
    conn = ScriptedConn([[]])
    db = FakeDb(conn)
    assert await monitor_tick(db, 60.0) == 0
