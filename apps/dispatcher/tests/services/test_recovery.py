from __future__ import annotations

import pytest

from services.recovery import recovery_once

from ._fakes import FakeDb, ScriptedConn


@pytest.mark.asyncio
async def test_recovery_marks_orphan_running_jobs():
    conn = ScriptedConn([
        [{"id": 1, "alloc_id": 1}],     # orphan running jobs
    ])
    db = FakeDb(conn)
    summary = await recovery_once(db, lost_host_threshold_s=60.0)
    assert summary == {"jobs_failed": 1}


@pytest.mark.asyncio
async def test_recovery_no_orphans():
    conn = ScriptedConn([
        [],
    ])
    db = FakeDb(conn)
    summary = await recovery_once(db, lost_host_threshold_s=60.0)
    assert summary == {"jobs_failed": 0}
