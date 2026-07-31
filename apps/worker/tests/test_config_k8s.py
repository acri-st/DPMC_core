from __future__ import annotations

import pytest
from pydantic import ValidationError

from worker.config import WorkerConfig

_BASE = {
    "api_url": "http://api/api",
    "worker_token": "x" * 20,
    "data_center_code": "ACR",
    "processing_dir": "/var/lib/dpmc/processing",
    "cache_dir": "/var/cache/dpmc",
}


def test_defaults_keep_current_behaviour() -> None:
    cfg = WorkerConfig(**_BASE, _env_file=None)
    assert cfg.execution_backend == "auto"
    assert cfg.k8s_namespace == ""
    assert cfg.k8s_job_ttl_s == 3600
    assert cfg.k8s_start_timeout_s == 300.0
    assert cfg.runner_slots == 1


def test_runner_slots_reads_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DPMC_RUNNER_SLOTS", "8")
    assert WorkerConfig(**_BASE, _env_file=None).runner_slots == 8


def test_runner_slots_rejects_zero() -> None:
    with pytest.raises(ValidationError):
        WorkerConfig(**_BASE, runner_slots=0, _env_file=None)


def test_kubernetes_mode_requires_pvc_and_mount_map() -> None:
    with pytest.raises(ValidationError):
        WorkerConfig(**_BASE, execution_backend="kubernetes", _env_file=None)


def test_kubernetes_mode_rejects_partial_config() -> None:
    with pytest.raises(ValidationError):
        WorkerConfig(
            **_BASE,
            execution_backend="kubernetes",
            k8s_pvc_name="worker-data",
            _env_file=None,
        )


def test_kubernetes_mode_accepts_full_config() -> None:
    cfg = WorkerConfig(
        **_BASE,
        execution_backend="kubernetes",
        k8s_pvc_name="worker-data",
        k8s_mount_map="/repo/data/warhol/runs=runs",
        _env_file=None,
    )
    assert cfg.execution_backend == "kubernetes"
    assert cfg.k8s_pvc_name == "worker-data"
    assert cfg.k8s_mount_map == "/repo/data/warhol/runs=runs"
