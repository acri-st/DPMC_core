"""Integration tests for `dpmc product create`."""

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
NEW_ID = "22222222-2222-2222-2222-222222222222"


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


def _mock_type_lookup(found: bool = True) -> None:
    body = (
        {"value": [{"id": "pt-1", "acronym": "L1B"}]}
        if found
        else {"value": []}
    )
    respx.get("http://api/odata/product-type").mock(
        return_value=Response(200, json=body)
    )


@respx.mock
def test_create_minimal() -> None:
    _mock_type_lookup()
    post = respx.post("http://api/odata/product").mock(
        return_value=Response(201, json={"id": NEW_ID, "name": "FOO"})
    )
    result = runner.invoke(app, ["product", "create", "--name", "FOO", "--type", "L1B"])
    assert result.exit_code == 0, result.stdout
    body = json.loads(post.calls[0].request.content.decode())
    assert body == {"name": "FOO", "productTypeId": "pt-1", "isDefault": False}
    assert f"Created product FOO ({NEW_ID})" in result.stdout


@respx.mock
def test_create_all_options() -> None:
    _mock_type_lookup()
    post = respx.post("http://api/odata/product").mock(
        return_value=Response(201, json={"id": NEW_ID, "name": "FOO"})
    )
    result = runner.invoke(
        app,
        [
            "product", "create",
            "--name", "FOO",
            "--type", "L1B",
            "--version", "v1",
            "--generated-at", "2026-05-01T00:00:00Z",
            "--size", "1024",
            "--default",
            "--comment", "hello",
        ],
    )
    assert result.exit_code == 0, result.stdout
    body = json.loads(post.calls[0].request.content.decode())
    assert body == {
        "name": "FOO",
        "productTypeId": "pt-1",
        "version": "v1",
        "generatedAt": "2026-05-01T00:00:00Z",
        "size": 1024,
        "isDefault": True,
        "comment": "hello",
    }


@respx.mock
def test_create_type_not_found() -> None:
    _mock_type_lookup(found=False)
    result = runner.invoke(app, ["product", "create", "--name", "FOO", "--type", "ZZZ"])
    assert result.exit_code == 1
    assert "ProductType 'ZZZ' not found" in result.stderr


@respx.mock
def test_create_duplicate() -> None:
    _mock_type_lookup()
    respx.post("http://api/odata/product").mock(
        return_value=Response(409, json={"message": "Unique constraint failed on (name, version)"})
    )
    result = runner.invoke(app, ["product", "create", "--name", "FOO", "--type", "L1B"])
    assert result.exit_code == 1
    assert "Unique constraint failed" in result.stderr


@respx.mock
def test_create_json_output() -> None:
    _mock_type_lookup()
    respx.post("http://api/odata/product").mock(
        return_value=Response(201, json={"id": NEW_ID, "name": "FOO", "version": "v1"})
    )
    result = runner.invoke(
        app, ["--json", "product", "create", "--name", "FOO", "--type", "L1B", "--version", "v1"]
    )
    assert result.exit_code == 0, result.stdout
    body = json.loads(result.stdout)
    assert body == {"id": NEW_ID, "name": "FOO", "version": "v1"}
