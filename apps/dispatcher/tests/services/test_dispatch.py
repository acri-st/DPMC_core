from __future__ import annotations

import pytest

from services.dispatch import dispatch_tick

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_dispatch_tick_no_jobs() -> None:
    conn = ScriptedConn([[]])  # ready jobs query returns empty
    db = FakeDb(conn)
    assert await dispatch_tick(db) == 0


@pytest.mark.asyncio
async def test_dispatch_tick_creates_allocation_when_host_fits() -> None:
    conn = ScriptedConn([
        [{
            "id": 1, "priority": 1, "class": "on_demand", "project_weight": 1.0,
            "ready_since_ms": 0,
            "cores": 2, "ram": 4_000_000_000, "disk": 10_000_000_000,
            "requires_gpu": False, "gpu_count": 0, "runtime": "docker",
        }],
        [{
            "id": 11, "cores": 8, "ram": 16_000_000_000, "disk": 200_000_000_000,
            "has_gpu": False, "gpu_count": 0, "status": "up",
            "container_runtime": "docker",
        }],
        [],  # no existing allocations
    ])
    db = FakeDb(conn)
    assert await dispatch_tick(db) == 1
    assert len(conn.inserts) == 1
    sql, params = conn.inserts[0]
    assert "INSERT" in sql.upper() and params[0] == 1 and params[1] == 11


@pytest.mark.asyncio
async def test_dispatch_tick_skips_when_no_host_fits() -> None:
    conn = ScriptedConn([
        [{
            "id": 1, "priority": 1, "class": "on_demand", "project_weight": 1.0,
            "ready_since_ms": 0,
            "cores": 2, "ram": 4_000_000_000, "disk": 10_000_000_000,
            "requires_gpu": False, "gpu_count": 0, "runtime": "docker",
        }],
        [{
            "id": 11, "cores": 1, "ram": 1_000_000_000, "disk": 1_000_000_000,
            "has_gpu": False, "gpu_count": 0, "status": "up",
            "container_runtime": "docker",
        }],
        [],
    ])
    db = FakeDb(conn)
    assert await dispatch_tick(db) == 0
    assert conn.inserts == []
