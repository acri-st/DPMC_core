from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from infrastructure.api_client import expand_task_via_api


@pytest.mark.asyncio
async def test_expand_task_via_api_calls_post() -> None:
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("infrastructure.api_client.httpx.AsyncClient", return_value=mock_client):
        await expand_task_via_api("http://api/api", "tok", 1)

    mock_client.post.assert_awaited_once_with(
        "/scheduler/task/1/expand", headers={"X-Worker-Token": "tok"}
    )
    mock_resp.raise_for_status.assert_called_once()


@pytest.mark.asyncio
async def test_expand_task_via_api_no_token_omits_auth_header() -> None:
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("infrastructure.api_client.httpx.AsyncClient", return_value=mock_client):
        await expand_task_via_api("http://api", "", 2)

    mock_client.post.assert_awaited_once_with("/scheduler/task/2/expand", headers={})
