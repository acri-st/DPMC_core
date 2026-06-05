"""Shared pytest fixtures for the CLI test suite."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _isolated_config_dir(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Point DPMC_CONFIG_DIR to a tmp directory so tests never touch real credentials."""
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
