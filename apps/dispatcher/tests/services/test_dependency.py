from __future__ import annotations

import pytest

from services.dependency import dep_tick

from ._fakes import FakeDb, ScriptedConn


def _waiting(job_id: int = 2) -> list[dict]:
    return [{"job_id": job_id}]


def _child_chain(pcid: int = 100) -> list[dict]:
    return [{"pcid": pcid}]


def _parents(*entries: tuple[str, int, str]) -> list[dict]:
    """Each entry: (mode, parent_id, parent_status)."""
    return [
        {"mode": mode, "parent_id": pid, "parent_status": status}
        for mode, pid, status in entries
    ]


@pytest.mark.asyncio
async def test_no_waiting_jobs_means_zero_changes() -> None:
    conn = ScriptedConn([[]])
    db = FakeDb(conn)
    assert await dep_tick(db) == 0
    assert conn.updates == []


@pytest.mark.asyncio
async def test_no_resolvable_chain_keeps_waiting() -> None:
    """If the child cannot be matched to a processing_chain row, the
    service treats it as having no parents → ready (forward progress)."""
    conn = ScriptedConn([
        _waiting(),
        [],  # chain lookup returns nothing
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)


@pytest.mark.asyncio
async def test_no_incoming_edges_means_ready() -> None:
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        [],  # no parent rows
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)


@pytest.mark.asyncio
async def test_on_success_with_succeeded_parent_promotes_to_ready() -> None:
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(("on_success", 1, "success")),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)


@pytest.mark.asyncio
async def test_on_success_with_failed_parent_skips() -> None:
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(("on_success", 1, "failed")),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("skipped", 2)


@pytest.mark.asyncio
async def test_on_failure_with_failed_parent_promotes_to_ready() -> None:
    """Edges flagged on_failure must respect their mode: a failed parent
    satisfies them, a succeeded parent skips the child."""
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(("on_failure", 1, "failed")),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)


@pytest.mark.asyncio
async def test_on_failure_with_succeeded_parent_skips() -> None:
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(("on_failure", 1, "success")),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("skipped", 2)


@pytest.mark.asyncio
async def test_mixed_modes_grouped_by_dependency_mode() -> None:
    """Two edges with different modes: on_success (parent A succeeded)
    and on_failure (parent B failed) — both satisfied → ready."""
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(
            ("on_success", 10, "success"),
            ("on_failure", 11, "failed"),
        ),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)


@pytest.mark.asyncio
async def test_on_data_available_edge_is_skipped_with_warning() -> None:
    """on_data_available is not yet wired; the edge is dropped from the
    decision and the child is treated as if no edges were declared."""
    conn = ScriptedConn([
        _waiting(),
        _child_chain(),
        _parents(("on_data_available", 12, "success")),
    ])
    db = FakeDb(conn)
    assert await dep_tick(db) == 1
    assert conn.updates[0][1] == ("ready", 2)
