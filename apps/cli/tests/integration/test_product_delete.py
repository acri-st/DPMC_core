"""Integration tests for `dpmc product delete`."""

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
PID = "33333333-3333-3333-3333-333333333333"


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


@respx.mock
def test_delete_text() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(200, json={"value": [{"id": PID, "version": "v1"}]})
    )
    respx.delete(f"http://api/odata/product/{PID}").mock(return_value=Response(204))
    result = runner.invoke(app, ["product", "delete", "FOO"])
    assert result.exit_code == 0, result.stdout
    assert "Deleted product FOO" in result.stdout


@respx.mock
def test_delete_json() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(200, json={"value": [{"id": PID, "version": "v1"}]})
    )
    respx.delete(f"http://api/odata/product/{PID}").mock(return_value=Response(204))
    result = runner.invoke(app, ["--json", "product", "delete", "FOO"])
    assert result.exit_code == 0, result.stdout
    body = json.loads(result.stdout)
    assert body == {"id": PID, "name": "FOO", "version": "v1"}


@respx.mock
def test_delete_ambiguous_without_version() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(
            200,
            json={
                "value": [
                    {"id": "a", "version": "v1"},
                    {"id": "b", "version": "v2"},
                ]
            },
        )
    )
    result = runner.invoke(app, ["product", "delete", "FOO"])
    assert result.exit_code == 1
    assert "Multiple products named 'FOO'" in result.stderr


@respx.mock
def test_delete_with_version_disambiguation() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(
            200,
            json={
                "value": [
                    {"id": "a", "version": "v1"},
                    {"id": PID, "version": "v2"},
                ]
            },
        )
    )
    respx.delete(f"http://api/odata/product/{PID}").mock(return_value=Response(204))
    result = runner.invoke(app, ["product", "delete", "FOO", "--version", "v2"])
    assert result.exit_code == 0, result.stdout


@respx.mock
def test_delete_not_found() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(200, json={"value": []})
    )
    result = runner.invoke(app, ["product", "delete", "MISSING"])
    assert result.exit_code == 1
    assert "Product 'MISSING' not found" in result.stderr
