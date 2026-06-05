"""Shared pytest fixtures."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from worker.config import WorkerConfig


@pytest.fixture
def worker_config(monkeypatch: pytest.MonkeyPatch) -> Iterator[WorkerConfig]:
    """Fully populated config; tests can override any field via env vars."""
    monkeypatch.setenv("DPMC_API_URL", "http://api.test/api")
    monkeypatch.setenv("DPMC_WORKER_TOKEN", "t" * 32)
    monkeypatch.setenv("DPMC_DATA_CENTER_CODE", "DC-TEST")
    monkeypatch.setenv("DPMC_PROCESSING_DIR", "/proc")
    monkeypatch.setenv("DPMC_CACHE_DIR", "/cache")
    monkeypatch.setenv("DPMC_HEARTBEAT_INTERVAL_S", "0.001")
    monkeypatch.setenv("DPMC_LOG_SHIPPING_ENABLED", "false")
    yield WorkerConfig()  # type: ignore[call-arg]
