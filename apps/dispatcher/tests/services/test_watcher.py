from __future__ import annotations

import pytest

from services.watcher import watcher_tick

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_no_watcher_chains_means_zero_tasks():
    conn = ScriptedConn([[]])
    db = FakeDb(conn)
    assert await watcher_tick(db) == 0
    assert conn.inserts == []


@pytest.mark.asyncio
async def test_creates_one_task_per_watcher_when_no_existing_open_task():
    conn = ScriptedConn([
        # 1) watcher chains
        [{"chain_id": 1, "watcher_config": None}],
        # 2) project lookup
        [{"id": 2}],
        # 3) "is there a Queued/Running Task?" → no
        [],
    ])
    db = FakeDb(conn)
    assert await watcher_tick(db) == 1
    assert len(conn.inserts) == 1


@pytest.mark.asyncio
async def test_skips_watcher_with_open_task():
    conn = ScriptedConn([
        [{"chain_id": 1, "watcher_config": None}],
        [{"id": 2}],
        [{"?column?": 1}],  # existing open task
    ])
    db = FakeDb(conn)
    assert await watcher_tick(db) == 0
    assert conn.inserts == []


@pytest.mark.asyncio
async def test_returns_zero_when_no_eligible_project():
    conn = ScriptedConn([
        [{"chain_id": 1, "watcher_config": None}],
        [],  # no project allows generic mode
    ])
    db = FakeDb(conn)
    assert await watcher_tick(db) == 0
    assert conn.inserts == []
