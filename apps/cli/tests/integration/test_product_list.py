"""Integration tests for `dpmc product list` against mocked OData responses."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest
import respx
from httpx import Response
from typer.testing import CliRunner

from dpmc_cli.auth.token_store import StoredCredentials, TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.main import app

runner = CliRunner()


@pytest.fixture(autouse=True)
def _logged_in(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("DPMC_API_URL", "http://api")
    monkeypatch.setenv("DPMC_KEYCLOAK_URL", "http://kc")
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    now = datetime.now(UTC)
    TokenStore(CliConfig()).save(
        StoredCredentials(
            issuer="http://kc/realms/dpmc",
            client_id="dpmc-api",
            access_token="AT",
            refresh_token="RT",
            access_token_expires_at=now + timedelta(seconds=300),
            refresh_token_expires_at=now + timedelta(seconds=1800),
        )
    )


def _odata_response(rows: list[dict[str, object]]) -> Response:
    return Response(200, json={"value": rows})


@respx.mock
def test_list_text_output() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=_odata_response(
            [
                {
                    "name": "FOO",
                    "version": "v1",
                    "generatedAt": "2026-05-01T00:00:00Z",
                    "size": 1024,
                    "productType": {"acronym": "L1B"},
                },
                {
                    "name": "BAR",
                    "version": None,
                    "generatedAt": None,
                    "size": None,
                    "productType": {"acronym": "L2A"},
                },
            ]
        )
    )
    result = runner.invoke(app, ["product", "list"])
    assert result.exit_code == 0, result.stdout
    assert "FOO" in result.stdout
    assert "BAR" in result.stdout
    assert "L1B" in result.stdout
    assert "L2A" in result.stdout


@respx.mock
def test_list_json_output() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=_odata_response(
            [
                {
                    "name": "FOO",
                    "version": "v1",
                    "generatedAt": "2026-05-01T00:00:00Z",
                    "size": 1024,
                    "productType": {"acronym": "L1B"},
                },
            ]
        )
    )
    result = runner.invoke(app, ["--json", "product", "list"])
    assert result.exit_code == 0
    rows = json.loads(result.stdout)
    assert rows == [
        {"name": "FOO", "version": "v1", "type": "L1B", "generated_at": "2026-05-01T00:00:00Z"},
    ]


@respx.mock
def test_list_with_size_includes_pretty_size() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=_odata_response(
            [
                {
                    "name": "FOO",
                    "version": None,
                    "generatedAt": None,
                    "size": 1024,
                    "productType": {"acronym": "L1B"},
                },
            ]
        )
    )
    result = runner.invoke(app, ["product", "list", "--with-size"])
    assert result.exit_code == 0
    assert "1.0 KiB" in result.stdout or "1.00 KiB" in result.stdout


@respx.mock
def test_list_filters_propagate_into_odata_query() -> None:
    route = respx.get("http://api/odata/product").mock(
        return_value=_odata_response([])
    )
    result = runner.invoke(app, ["product", "list", "--name-like", "foo", "--type", "L1B"])
    assert result.exit_code == 0
    sent = route.calls[0].request.url
    qs = dict(sent.params)
    assert "$filter" in qs
    assert "contains(name, 'foo')" in qs["$filter"]
    assert "productType/acronym eq 'L1B'" in qs["$filter"]
