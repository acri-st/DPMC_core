"""Integration tests for `dpmc product get`."""

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


PRODUCT = {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "FOO",
    "version": "v1",
    "productTypeId": "pt-1",
    "isDefault": False,
    "size": 1024,
    "generatedAt": "2026-05-01T00:00:00Z",
    "parentBatchId": None,
    "parameters": None,
    "comment": None,
    "createdAt": "2026-05-01T00:00:00Z",
    "productType": {"acronym": "L1B"},
}


@respx.mock
def test_get_by_uuid_text() -> None:
    respx.get(f"http://api/odata/product/{PRODUCT['id']}").mock(
        return_value=Response(200, json=PRODUCT)
    )
    result = runner.invoke(app, ["product", "get", PRODUCT["id"]])
    assert result.exit_code == 0
    assert "name: FOO" in result.stdout
    assert "type: L1B" in result.stdout


@respx.mock
def test_get_by_name_resolves_then_fetches() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(200, json={"value": [{"id": PRODUCT["id"], "version": "v1"}]})
    )
    respx.get(f"http://api/odata/product/{PRODUCT['id']}").mock(
        return_value=Response(200, json=PRODUCT)
    )
    result = runner.invoke(app, ["product", "get", "FOO"])
    assert result.exit_code == 0
    assert "name: FOO" in result.stdout


@respx.mock
def test_get_by_name_not_found() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(200, json={"value": []})
    )
    result = runner.invoke(app, ["product", "get", "MISSING"])
    assert result.exit_code == 1
    assert "Product 'MISSING' not found" in result.stderr


@respx.mock
def test_get_by_name_ambiguous_without_version() -> None:
    respx.get("http://api/odata/product").mock(
        return_value=Response(
            200,
            json={
                "value": [
                    {"id": "id-a", "version": "v1"},
                    {"id": "id-b", "version": "v2"},
                ]
            },
        )
    )
    result = runner.invoke(app, ["product", "get", "FOO"])
    assert result.exit_code == 1
    assert "Multiple products named 'FOO'" in result.stderr
    assert "v1" in result.stderr and "v2" in result.stderr


@respx.mock
def test_get_json_output() -> None:
    respx.get(f"http://api/odata/product/{PRODUCT['id']}").mock(
        return_value=Response(200, json=PRODUCT)
    )
    result = runner.invoke(app, ["--json", "product", "get", PRODUCT["id"]])
    assert result.exit_code == 0
    body = json.loads(result.stdout)
    assert body["name"] == "FOO"
    assert body["productType"]["acronym"] == "L1B"
