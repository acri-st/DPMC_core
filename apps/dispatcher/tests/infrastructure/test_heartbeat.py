from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from infrastructure.heartbeat import SchedulerHeartbeat


@pytest.mark.asyncio
async def test_maybe_send_posts_heartbeat() -> None:
    sh = SchedulerHeartbeat("http://api/api", "tok", min_interval_s=0.0)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("infrastructure.heartbeat.httpx.AsyncClient", return_value=mock_client):
        ok = await sh.maybe_send(queue_depth=2, running_count=3)

    assert ok is True
    args, kwargs = mock_client.post.call_args
    assert args[0] == "/scheduler/heartbeat"
    assert kwargs["json"] == {"queueDepth": 2, "runningCount": 3}
    assert kwargs["headers"] == {"X-Worker-Token": "tok"}


@pytest.mark.asyncio
async def test_debounce_blocks_rapid_calls() -> None:
    sh = SchedulerHeartbeat("http://api/api", "tok", min_interval_s=10.0)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("infrastructure.heartbeat.httpx.AsyncClient", return_value=mock_client):
        first = await sh.maybe_send(0, 0)
        second = await sh.maybe_send(0, 0)

    assert first is True
    assert second is False
    assert mock_client.post.await_count == 1
