"""Unit tests for ``worker.api``."""

from __future__ import annotations

import httpx
import pytest

from worker.api import ApiError, WorkerApi


def _make_api(handler: object) -> WorkerApi:
    transport = httpx.MockTransport(handler)  # type: ignore[arg-type]
    api = WorkerApi("http://api.test", "secret-token-secret-token", timeout=1.0)
    api._client = httpx.Client(
        base_url="http://api.test",
        transport=transport,
        headers={WorkerApi.HEADER_NAME: "secret-token-secret-token"},
    )
    return api


def test_register_posts_to_host_register_with_token_header() -> None:
    captured: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        captured["url"] = str(req.url)
        captured["method"] = req.method
        captured["token"] = req.headers.get("x-worker-token")
        captured["body"] = req.content.decode()
        return httpx.Response(
            200,
            json={
                "success": "OK",
                "status": 200,
                "message": "ok",
                "data": {"id": 1, "hostname": "h1"},
            },
        )

    api = _make_api(handler)
    result = api.register({"hostname": "h1", "nbCores": 4})

    assert result == {"id": 1, "hostname": "h1"}
    assert captured["url"] == "http://api.test/host/register"
    assert captured["method"] == "POST"
    assert captured["token"] == "secret-token-secret-token"
    assert '"hostname":"h1"' in captured["body"]


def test_heartbeat_targets_the_right_path() -> None:
    def handler(req: httpx.Request) -> httpx.Response:
        assert str(req.url) == "http://api.test/host/1/heartbeat"
        assert req.method == "POST"
        return httpx.Response(
            200, json={"success": "OK", "status": 200, "data": {"id": 1}}
        )

    api = _make_api(handler)
    assert api.heartbeat(1) == {"id": 1}


def test_update_status_uses_patch_with_body() -> None:
    captured: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        captured["url"] = str(req.url)
        captured["method"] = req.method
        captured["body"] = req.content.decode()
        return httpx.Response(
            200, json={"success": "OK", "status": 200, "data": {"status": "Off"}}
        )

    api = _make_api(handler)
    api.update_status(1, "Off")

    assert captured["url"] == "http://api.test/host/1/status"
    assert captured["method"] == "PATCH"
    assert '"status":"Off"' in captured["body"]


def test_raises_api_error_on_4xx_with_status_code() -> None:
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "nope"})

    api = _make_api(handler)
    with pytest.raises(ApiError) as exc:
        api.heartbeat(1)
    assert exc.value.status_code == 401


def test_raises_api_error_on_404() -> None:
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "missing"})

    api = _make_api(handler)
    with pytest.raises(ApiError) as exc:
        api.heartbeat(1)
    assert exc.value.status_code == 404


def test_raises_api_error_on_network_error_with_status_zero() -> None:
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    api = _make_api(handler)
    with pytest.raises(ApiError) as exc:
        api.heartbeat(1)
    assert exc.value.status_code == 0


def test_ingest_logs_posts_batch_to_logs_endpoint() -> None:
    captured: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        captured["url"] = str(req.url)
        captured["method"] = req.method
        captured["body"] = req.content.decode()
        return httpx.Response(
            200,
            json={"success": "OK", "status": 200, "data": {"accepted": 2}},
        )

    api = _make_api(handler)
    result = api.ingest_logs(
        1,
        [
            {"level": "Info", "message": "hi", "loggedAt": "2026-04-29T10:00:00Z"},
            {
                "level": "Error",
                "message": "oops",
                "loggedAt": "2026-04-29T10:00:01Z",
            },
        ],
    )

    assert result == {"accepted": 2}
    assert captured["url"] == "http://api.test/host/1/logs"
    assert captured["method"] == "POST"
    assert '"logs":[' in captured["body"]
    assert '"level":"Info"' in captured["body"]
    assert '"level":"Error"' in captured["body"]


def test_returns_empty_dict_when_envelope_has_no_data() -> None:
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"success": "OK", "status": 200})

    api = _make_api(handler)
    assert api.heartbeat(1) == {}
