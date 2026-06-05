"""Tests for credential persistence."""

from __future__ import annotations

import json
import os
import stat
from datetime import UTC, datetime

from dpmc_cli.auth.token_store import StoredCredentials, TokenStore
from dpmc_cli.config import CliConfig


def _creds() -> StoredCredentials:
    now = datetime(2026, 5, 11, 12, 0, 0, tzinfo=UTC)
    return StoredCredentials(
        issuer="http://localhost:8080/realms/dpmc",
        client_id="dpmc-api",
        access_token="at",
        refresh_token="rt",
        access_token_expires_at=now,
        refresh_token_expires_at=now,
    )


def test_save_and_load_round_trip(tmp_path) -> None:
    cfg = CliConfig(config_dir=tmp_path)
    store = TokenStore(cfg)
    store.save(_creds())
    loaded = store.load()
    assert loaded is not None
    assert loaded.access_token == "at"
    assert loaded.refresh_token == "rt"


def test_file_mode_is_0600(tmp_path) -> None:
    cfg = CliConfig(config_dir=tmp_path)
    store = TokenStore(cfg)
    store.save(_creds())
    mode = stat.S_IMODE(os.stat(store.path).st_mode)
    assert mode == 0o600
    dir_mode = stat.S_IMODE(os.stat(tmp_path).st_mode)
    assert dir_mode == 0o700


def test_load_returns_none_when_missing(tmp_path) -> None:
    cfg = CliConfig(config_dir=tmp_path / "nope")
    store = TokenStore(cfg)
    assert store.load() is None


def test_clear_is_idempotent(tmp_path) -> None:
    cfg = CliConfig(config_dir=tmp_path)
    store = TokenStore(cfg)
    store.clear()  # missing → no error
    store.save(_creds())
    store.clear()
    assert store.load() is None


def test_save_writes_iso_timestamps(tmp_path) -> None:
    cfg = CliConfig(config_dir=tmp_path)
    store = TokenStore(cfg)
    store.save(_creds())
    raw = json.loads(store.path.read_text())
    assert raw["access_token_expires_at"].endswith("+00:00") or raw["access_token_expires_at"].endswith("Z")
