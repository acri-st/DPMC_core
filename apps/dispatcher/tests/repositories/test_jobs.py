from __future__ import annotations

import pytest

from domain.retry import RetryPolicy
from repositories.jobs import retry_or_fail_job

POLICY = RetryPolicy(
    max_attempts=3, backoff_base_s=30.0, backoff_cap_s=3600.0, backoff_multiplier=2.0
)


class _Cur:
    async def fetchall(self):
        return []


class _Conn:
    """Captures UPDATE statements so the retry decision can be asserted."""

    def __init__(self):
        self.updates: list[tuple[str, tuple]] = []

    async def execute(self, sql, params=None):
        if sql.lstrip().upper().startswith("UPDATE"):
            self.updates.append((sql, params))
        return _Cur()

    def _job_update(self):
        # The job row update is the one carrying the `attempt` column.
        rows = [(s, p) for s, p in self.updates if "attempt" in s]
        assert len(rows) == 1, f"expected exactly one job update, got {rows}"
        return rows[0]


@pytest.mark.asyncio
async def test_retry_requeues_to_ready_with_backoff_and_releases_allocation():
    conn = _Conn()
    outcome = await retry_or_fail_job(
        conn, job_id=1, attempt=0, allocation_id=5, error="host lost", policy=POLICY
    )
    assert outcome == "retried"

    # allocation released
    assert any(
        '"job_x_allocation"' in s and "releasedAt" in s for s, _ in conn.updates
    )

    _, params = conn._job_update()
    assert params[0] == "ready"      # re-queued, not terminal
    assert params[2] == 1            # attempt bumped 0 -> 1
    assert params[3] == "30.0"       # first-retry backoff


@pytest.mark.asyncio
async def test_backoff_grows_with_attempt():
    conn = _Conn()
    await retry_or_fail_job(
        conn, job_id=1, attempt=1, allocation_id=None, error="host lost", policy=POLICY
    )
    _, params = conn._job_update()
    assert params[2] == 2            # attempt 1 -> 2
    assert params[3] == "60.0"       # second-retry backoff


@pytest.mark.asyncio
async def test_exhausted_marks_failed_terminally():
    conn = _Conn()
    outcome = await retry_or_fail_job(
        conn, job_id=1, attempt=2, allocation_id=None, error="host lost", policy=POLICY
    )
    assert outcome == "exhausted"

    _, params = conn._job_update()
    assert params[0] == "failed"     # terminal
    assert params[2] == 3            # attempt 2 -> 3 (== max_attempts)
    assert "exhausted" in params[1]


@pytest.mark.asyncio
async def test_no_allocation_means_no_release_update():
    conn = _Conn()
    await retry_or_fail_job(
        conn, job_id=1, attempt=0, allocation_id=None, error="host lost", policy=POLICY
    )
    assert not any('"job_x_allocation"' in s for s, _ in conn.updates)
