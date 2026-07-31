from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from kubernetes.client.exceptions import ApiException

from worker.backends.base import BackendDispatch, BackendMount
from worker.backends.kubernetes import (
    KubernetesBackend,
    _sample_pod_metrics,
    build_job_manifest,
    parse_mount_map,
    parse_tolerations,
    resolve_mounts,
)


def test_parse_mount_map_orders_longest_prefix_first() -> None:
    pairs = parse_mount_map("/a=x,/a/b=y")
    assert pairs == [("/a/b", "y"), ("/a", "x")]


def test_parse_mount_map_rejects_malformed_entry() -> None:
    with pytest.raises(ValueError):
        parse_mount_map("/a=x,broken")


def test_resolve_mounts_maps_source_to_pvc_subpath() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs,/var/cache/dpmc=cache")
    vms, volumes = resolve_mounts(
        [
            BackendMount(source="/repo/data/warhol/runs/b42", target="/work"),
            BackendMount(source="/var/cache/dpmc", target="/cache", read_only=True),
        ],
        mm,
    )
    assert vms == [
        {"name": "data", "mountPath": "/work", "subPath": "runs/b42"},
        {"name": "data", "mountPath": "/cache", "subPath": "cache", "readOnly": True},
    ]
    assert volumes == []


def test_resolve_mounts_supports_pvc_sources() -> None:
    """`pvc://<claim>[/subpath]` sources (static volumes such as the CryoSat
    sad/ tree) mount the named claim directly, deduplicated per claim."""
    vms, volumes = resolve_mounts(
        [
            BackendMount(
                source="pvc://cryosat-sad", target="/data/cryosat-sad", read_only=True
            ),
            BackendMount(source="pvc://cryosat-sad/FES", target="/data/fes"),
        ],
        [],
    )
    assert vms == [
        {"name": "pvc-cryosat-sad", "mountPath": "/data/cryosat-sad", "readOnly": True},
        {"name": "pvc-cryosat-sad", "mountPath": "/data/fes", "subPath": "FES"},
    ]
    assert volumes == [
        {
            "name": "pvc-cryosat-sad",
            "persistentVolumeClaim": {"claimName": "cryosat-sad"},
        }
    ]


def test_resolve_mounts_rejects_empty_pvc_claim() -> None:
    with pytest.raises(ValueError, match="without a claim"):
        resolve_mounts([BackendMount(source="pvc://", target="/x")], [])


def test_parse_mount_map_rejects_empty_subpath() -> None:
    with pytest.raises(ValueError):
        parse_mount_map("/a=/")


def test_resolve_mounts_rejects_false_prefix_match() -> None:
    mm = parse_mount_map("/a=x")
    with pytest.raises(ValueError, match="outside mount map"):
        resolve_mounts([BackendMount(source="/ab", target="/work")], mm)


def test_resolve_mounts_rejects_source_outside_map() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    with pytest.raises(ValueError, match="outside mount map"):
        resolve_mounts([BackendMount(source="/etc", target="/etc")], mm)


def _dispatch(**over: object) -> BackendDispatch:
    base: dict = dict(
        image="harbor.example/proc:1",
        command=["python", "run.py"],
        env={"DPMC_BATCH_ID": "b42"},
        mounts=[BackendMount(source="/repo/data/warhol/runs/b42", target="/work")],
        cpus=2.0,
        memory_bytes=1_073_741_824,
        gpus=[],
    )
    base.update(over)
    return BackendDispatch(**base)


def test_build_job_manifest_shape() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    job = build_job_manifest(
        7,
        _dispatch(),
        mount_map=mm,
        pvc_name="worker-data",
        image_pull_secret="harbor-pull-secret",
        ttl_s=3600,
    )
    assert job["metadata"]["name"] == "dpmc-job-7"
    assert job["spec"]["backoffLimit"] == 0
    assert job["spec"]["ttlSecondsAfterFinished"] == 3600
    pod = job["spec"]["template"]["spec"]
    assert pod["restartPolicy"] == "Never"
    assert pod["imagePullSecrets"] == [{"name": "harbor-pull-secret"}]
    assert pod["volumes"] == [
        {"name": "data", "persistentVolumeClaim": {"claimName": "worker-data"}}
    ]
    c = pod["containers"][0]
    assert c["image"] == "harbor.example/proc:1"
    assert c["imagePullPolicy"] == "Always"  # mutable tags must re-pull
    assert c["args"] == ["python", "run.py"]
    assert "command" not in c  # keep the image ENTRYPOINT, like `docker run`
    assert {"name": "DPMC_BATCH_ID", "value": "b42"} in c["env"]
    assert c["resources"]["limits"] == {"cpu": "2", "memory": "1073741824"}
    assert c["resources"]["requests"] == c["resources"]["limits"]
    assert c["volumeMounts"][0]["subPath"] == "runs/b42"


def test_build_job_manifest_gpus_and_no_pull_secret() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    job = build_job_manifest(
        8,
        _dispatch(gpus=[0, 1]),
        mount_map=mm,
        pvc_name="pvc",
        image_pull_secret="",
        ttl_s=60,
    )
    pod = job["spec"]["template"]["spec"]
    assert "imagePullSecrets" not in pod
    assert pod["containers"][0]["resources"]["limits"]["nvidia.com/gpu"] == "2"


def test_parse_tolerations_empty_and_valid() -> None:
    assert parse_tolerations("") == []
    assert parse_tolerations('[{"key": "project", "value": "shared"}]') == [
        {"key": "project", "value": "shared"}
    ]


def test_parse_tolerations_rejects_bad_json() -> None:
    with pytest.raises(ValueError):
        parse_tolerations("{not json")
    with pytest.raises(ValueError):
        parse_tolerations('{"key": "not-a-list"}')


def test_build_job_manifest_includes_tolerations() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    tol = [{"key": "project", "operator": "Equal", "value": "shared", "effect": "NoSchedule"}]
    job = build_job_manifest(
        10,
        _dispatch(),
        mount_map=mm,
        pvc_name="pvc",
        image_pull_secret="",
        ttl_s=60,
        tolerations=tol,
    )
    assert job["spec"]["template"]["spec"]["tolerations"] == tol


def test_build_job_manifest_restricted_security_context() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    job = build_job_manifest(
        11,
        _dispatch(),
        mount_map=mm,
        pvc_name="pvc",
        image_pull_secret="",
        ttl_s=60,
        run_as_uid=1234,
    )
    pod = job["spec"]["template"]["spec"]
    assert pod["securityContext"] == {
        "runAsNonRoot": True,
        "runAsUser": 1234,
        "runAsGroup": 1234,
        "fsGroup": 1234,
        "seccompProfile": {"type": "RuntimeDefault"},
    }
    assert pod["containers"][0]["securityContext"] == {
        "allowPrivilegeEscalation": False,
        "capabilities": {"drop": ["ALL"]},
    }


def test_build_job_manifest_requires_image() -> None:
    mm = parse_mount_map("/repo/data/warhol/runs=runs")
    with pytest.raises(ValueError):
        build_job_manifest(
            9,
            _dispatch(image=None),
            mount_map=mm,
            pvc_name="p",
            image_pull_secret="",
            ttl_s=60,
        )


# ---------------------------------------------------------------------------
# KubernetesBackend unit tests
# ---------------------------------------------------------------------------


class _Cfg:
    k8s_namespace = "eocp"
    k8s_pvc_name = "worker-data"
    k8s_mount_map = "/repo/data/warhol/runs=runs"
    k8s_image_pull_secret = "harbor-pull-secret"
    k8s_job_ttl_s = 3600
    k8s_start_timeout_s = 0.2
    k8s_job_tolerations = '[{"key": "project", "operator": "Equal", "value": "shared", "effect": "NoSchedule"}]'
    k8s_job_run_as_uid = 1000


def _pod(phase: str, exit_code: int | None = None, waiting_reason: str | None = None):
    terminated = (
        SimpleNamespace(exit_code=exit_code, reason="Completed")
        if exit_code is not None
        else None
    )
    waiting = SimpleNamespace(reason=waiting_reason) if waiting_reason else None
    status = SimpleNamespace(
        phase=phase,
        container_statuses=[
            SimpleNamespace(state=SimpleNamespace(terminated=terminated, waiting=waiting))
        ],
    )
    return SimpleNamespace(metadata=SimpleNamespace(name="dpmc-job-7-abc"), status=status)


def _log_resp(*chunks: bytes):
    """Fake read_namespaced_pod_log(_preload_content=False) response: a byte
    stream the backend splits into lines."""
    resp = MagicMock()
    resp.stream.return_value = iter(chunks)
    return resp


def test_run_happy_path_streams_logs_and_returns_exit_code() -> None:
    backend = KubernetesBackend(_Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock())
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(items=[_pod("Running")])
    backend._core.read_namespaced_pod.return_value = _pod("Succeeded", exit_code=0)

    backend._core.read_namespaced_pod_log.return_value = _log_resp(b"hello\nworld\n")

    lines: list[str] = []
    result = backend.run(7, _dispatch(), lines.append)

    backend._batch.create_namespaced_job.assert_called_once()
    _, kwargs = backend._batch.create_namespaced_job.call_args
    assert kwargs["namespace"] == "eocp"
    assert kwargs["body"]["metadata"]["name"] == "dpmc-job-7"
    assert lines == ["hello", "world"]
    assert result.exit_code == 0


def test_run_nonzero_exit_code() -> None:
    backend = KubernetesBackend(_Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock())
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(items=[_pod("Running")])
    backend._core.read_namespaced_pod.return_value = _pod("Failed", exit_code=137)
    backend._core.read_namespaced_pod_log.return_value = _log_resp()

    result = backend.run(7, _dispatch(), lambda _l: None)

    assert result.exit_code == 137


def test_run_start_timeout_deletes_job_and_raises() -> None:
    backend = KubernetesBackend(_Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock())
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(
        items=[_pod("Pending", waiting_reason="ImagePullBackOff")]
    )

    with patch("worker.backends.kubernetes._START_POLL_INTERVAL_S", 0.01), pytest.raises(
        RuntimeError, match="ImagePullBackOff"
    ):
        backend.run(7, _dispatch(), lambda _l: None)

    backend._batch.delete_namespaced_job.assert_called_once()


def test_run_replaces_leftover_job_on_conflict() -> None:
    backend = KubernetesBackend(
        _Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock()
    )
    backend._batch.create_namespaced_job.side_effect = [ApiException(status=409), None]
    backend._batch.read_namespaced_job.side_effect = ApiException(status=404)
    backend._core.list_namespaced_pod.side_effect = [
        SimpleNamespace(items=[]),  # stale pods already gone
        SimpleNamespace(items=[_pod("Running")]),
    ]
    backend._core.read_namespaced_pod.return_value = _pod("Succeeded", exit_code=0)
    backend._core.read_namespaced_pod_log.return_value = _log_resp()

    with patch("worker.backends.kubernetes._START_POLL_INTERVAL_S", 0.01):
        result = backend.run(7, _dispatch(), lambda _l: None)

    assert result.exit_code == 0
    assert backend._batch.create_namespaced_job.call_count == 2
    _, kwargs = backend._batch.delete_namespaced_job.call_args
    assert kwargs["propagation_policy"] == "Foreground"


def test_run_pod_deleted_mid_wait_returns_failure() -> None:
    backend = KubernetesBackend(
        _Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock()
    )
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(items=[_pod("Running")])
    backend._core.read_namespaced_pod.side_effect = ApiException(status=404)
    backend._core.read_namespaced_pod_log.return_value = _log_resp()

    result = backend.run(7, _dispatch(), lambda _l: None)

    assert result.exit_code == 1


def test_cancel_deletes_job() -> None:
    backend = KubernetesBackend(_Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock())
    backend.cancel(7)
    _, kwargs = backend._batch.delete_namespaced_job.call_args
    assert kwargs["name"] == "dpmc-job-7"
    assert kwargs["propagation_policy"] == "Background"


def test_sample_pod_metrics_parses_quantities() -> None:
    metrics = MagicMock()
    metrics.get_namespaced_custom_object.return_value = {
        "containers": [
            {"usage": {"cpu": "500m", "memory": "256Mi"}},
            {"usage": {"cpu": "250m", "memory": "128Mi"}},
        ]
    }
    cores, mem = _sample_pod_metrics(metrics, "eocp", "pod-x")
    assert cores == pytest.approx(0.75)
    assert mem == 384 * 1024 * 1024


def test_run_reports_sampled_metrics() -> None:
    backend = KubernetesBackend(
        _Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock()
    )
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(items=[_pod("Running")])
    backend._core.read_namespaced_pod.return_value = _pod("Succeeded", exit_code=0)
    backend._metrics.get_namespaced_custom_object.return_value = {
        "containers": [{"usage": {"cpu": "1", "memory": "100Mi"}}]
    }
    backend._core.read_namespaced_pod_log.return_value = _log_resp(b"x")

    with patch("worker.backends.kubernetes._METRICS_INTERVAL_S", 0.01):
        result = backend.run(7, _dispatch(), lambda _l: None)

    assert result.peak_rss_bytes == 100 * 1024 * 1024
    assert result.cpu_seconds is not None
    assert 0 < result.cpu_seconds < 1.0  # 1 core integrated over a sub-second run


def test_run_survives_missing_metrics_api() -> None:
    backend = KubernetesBackend(
        _Cfg(), batch_api=MagicMock(), core_api=MagicMock(), metrics_api=MagicMock()
    )
    backend._core.list_namespaced_pod.return_value = SimpleNamespace(items=[_pod("Running")])
    backend._core.read_namespaced_pod.return_value = _pod("Succeeded", exit_code=0)
    backend._metrics.get_namespaced_custom_object.side_effect = RuntimeError("404")
    backend._core.read_namespaced_pod_log.return_value = _log_resp()

    result = backend.run(7, _dispatch(), lambda _l: None)

    assert result.exit_code == 0
    assert result.cpu_seconds is None
    assert result.peak_rss_bytes is None
