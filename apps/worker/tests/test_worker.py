"""Unit tests for ``worker.main``."""

from __future__ import annotations

import logging
from unittest.mock import MagicMock

import pytest

from worker.api import ApiError
from worker.config import WorkerConfig
from worker.main import Worker, collect_facts

REQUIRED_FACTS = {
    "dataCenterCode",
    "hostname",
    "ipAddress",
    "osType",
    "osVersion",
    "processingDir",
    "cacheDir",
    "nbCores",
    "ram",
    "disk",
    "schedulingPriority",
    "hasGpu",
    "gpuCount",
    "gpuModel",
    "containerRuntime",
}


def test_collect_facts_returns_all_fields_required_by_register_body(
    worker_config: WorkerConfig,
) -> None:
    facts = collect_facts(worker_config)

    assert REQUIRED_FACTS.issubset(facts.keys())
    assert facts["dataCenterCode"] == worker_config.data_center_code
    assert facts["processingDir"] == worker_config.processing_dir
    assert facts["cacheDir"] == worker_config.cache_dir
    assert facts["schedulingPriority"] == worker_config.scheduling_priority
    assert isinstance(facts["nbCores"], int) and facts["nbCores"] >= 1
    assert isinstance(facts["ram"], int) and facts["ram"] >= 0
    assert isinstance(facts["disk"], int) and facts["disk"] >= 0
    assert facts["osType"] in ("Linux", "Darwin", "Windows")


def test_run_registers_then_heartbeats_then_marks_off(
    worker_config: WorkerConfig,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="worker")
    w = Worker(worker_config)
    w._api = MagicMock()
    w._api.register.return_value = {"id": 7, "hostname": "h1"}

    calls = {"n": 0}

    def fake_heartbeat(host_id: int) -> dict:
        calls["n"] += 1
        if calls["n"] >= 2:
            w._shutdown.set()
        return {}

    w._api.heartbeat.side_effect = fake_heartbeat

    exit_code = w.run()

    assert exit_code == 0
    w._api.register.assert_called_once()
    assert w._api.heartbeat.call_count >= 2
    w._api.update_status.assert_called_once_with(7, "Off")
    w._api.close.assert_called_once()
    assert "Heartbeat sent host=7" in caplog.text
    # Log shipping is disabled in the test fixture.
    assert w._shipper is None


def test_run_returns_1_on_registration_failure(
    worker_config: WorkerConfig,
) -> None:
    w = Worker(worker_config)
    w._api = MagicMock()
    w._api.register.side_effect = ApiError(500, "boom")

    exit_code = w.run()

    assert exit_code == 1
    w._api.heartbeat.assert_not_called()
    w._api.update_status.assert_not_called()


def test_heartbeat_404_triggers_re_registration(
    worker_config: WorkerConfig,
) -> None:
    w = Worker(worker_config)
    w._api = MagicMock()
    w._api.register.return_value = {"id": 7, "hostname": "h1"}

    seq: list[ApiError | None] = [ApiError(404, "gone"), None]

    def fake_heartbeat(host_id: int) -> dict:
        item = seq.pop(0) if seq else None
        if isinstance(item, ApiError):
            raise item
        w._shutdown.set()
        return {}

    w._api.heartbeat.side_effect = fake_heartbeat

    exit_code = w.run()

    assert exit_code == 0
    assert w._api.register.call_count == 2


def test_run_starts_and_stops_log_shipper_when_enabled(
    worker_config: WorkerConfig, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DPMC_LOG_SHIPPING_ENABLED", "true")
    cfg = WorkerConfig()  # type: ignore[call-arg]

    w = Worker(cfg)
    w._api = MagicMock()
    w._api.register.return_value = {"id": 7, "hostname": "h1"}
    w._api.ingest_logs.return_value = {"accepted": 0}

    def fake_heartbeat(host_id: int) -> dict:
        w._shutdown.set()
        return {}

    w._api.heartbeat.side_effect = fake_heartbeat

    exit_code = w.run()

    assert exit_code == 0
    assert w._shipper is not None
    # After run() returns, the shipper has been stopped (no thread).
    assert w._shipper._thread is None


def test_signal_handler_sets_shutdown_event(worker_config: WorkerConfig) -> None:
    w = Worker(worker_config)
    assert not w._shutdown.is_set()
    w._on_signal()
    assert w._shutdown.is_set()


def test_main_returns_2_when_config_is_invalid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for var in (
        "DPMC_API_URL",
        "DPMC_WORKER_TOKEN",
        "DPMC_DATA_CENTER_CODE",
        "DPMC_PROCESSING_DIR",
        "DPMC_CACHE_DIR",
    ):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.chdir("/tmp")

    from worker.main import main

    assert main() == 2
