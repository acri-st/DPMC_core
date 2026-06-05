from __future__ import annotations

import pytest

from domain.retry import RetryPolicy
from services.recovery import recovery_once

from ._fakes import FakeDb, ScriptedConn

POLICY = RetryPolicy(
    max_attempts=3, backoff_base_s=30.0, backoff_cap_s=3600.0, backoff_multiplier=2.0
)


@pytest.mark.asyncio
async def test_recovery_retries_orphan_running_jobs():
    conn = ScriptedConn([
        [{"id": 1, "attempt": 0, "alloc_id": 1}],  # orphan running jobs
    ])
    db = FakeDb(conn)
    summary = await recovery_once(db, lost_host_threshold_s=60.0, retry=POLICY)
    assert summary == {"jobs_retried": 1, "jobs_exhausted": 0}


@pytest.mark.asyncio
async def test_recovery_exhausts_orphan_at_max_attempts():
    conn = ScriptedConn([
        [{"id": 1, "attempt": 2, "alloc_id": 1}],
    ])
    db = FakeDb(conn)
    summary = await recovery_once(db, lost_host_threshold_s=60.0, retry=POLICY)
    assert summary == {"jobs_retried": 0, "jobs_exhausted": 1}


@pytest.mark.asyncio
async def test_recovery_no_orphans():
    conn = ScriptedConn([
        [],
    ])
    db = FakeDb(conn)
    summary = await recovery_once(db, lost_host_threshold_s=60.0, retry=POLICY)
    assert summary == {"jobs_retried": 0, "jobs_exhausted": 0}
