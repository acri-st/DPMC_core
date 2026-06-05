from __future__ import annotations

import pytest

from domain.retry import RetryPolicy
from services.monitor import monitor_tick

from ._fakes import FakeDb, ScriptedConn

POLICY = RetryPolicy(
    max_attempts=3, backoff_base_s=30.0, backoff_cap_s=3600.0, backoff_multiplier=2.0
)


def _job_update(conn):
    rows = [u for u in conn.updates if "attempt" in u[0]]
    assert len(rows) == 1
    return rows[0]


@pytest.mark.asyncio
async def test_monitor_tick_retries_lost_job_with_attempts_remaining():
    conn = ScriptedConn([
        [{"id": 1, "attempt": 0, "alloc_id": 1}],
    ])
    db = FakeDb(conn)
    handled = await monitor_tick(db, 60.0, POLICY)
    assert handled == 1
    assert any('"job_x_allocation"' in u[0] for u in conn.updates)
    _, params = _job_update(conn)
    assert params[0] == "ready"  # re-queued for another attempt


@pytest.mark.asyncio
async def test_monitor_tick_fails_terminally_when_attempts_exhausted():
    conn = ScriptedConn([
        [{"id": 1, "attempt": 2, "alloc_id": 1}],
    ])
    db = FakeDb(conn)
    handled = await monitor_tick(db, 60.0, POLICY)
    assert handled == 1
    _, params = _job_update(conn)
    assert params[0] == "failed"  # terminal, attempts exhausted


@pytest.mark.asyncio
async def test_monitor_tick_no_lost_jobs():
    conn = ScriptedConn([[]])
    db = FakeDb(conn)
    assert await monitor_tick(db, 60.0, POLICY) == 0
