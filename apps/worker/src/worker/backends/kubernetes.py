"""Kubernetes execution backend (one ``batch/v1 Job`` per dispatch).

Serves "Docker" dispatches (OCI images) on containerd-only clusters. The
worker registers with the host-only capability "Kubernetes"; the dispatcher
treats that as satisfying a Docker (OCI) requirement, so Docker dispatches
land here unchanged. Design doc:
docs/superpowers/specs/2026-06-12-worker-kubernetes-backend-design.md (parent repo).
"""

from __future__ import annotations

import json
import logging
import socket
import threading
import time
from collections.abc import Callable, Sequence
from pathlib import Path

from kubernetes.client.exceptions import ApiException
from kubernetes.utils.quantity import parse_quantity

from .base import BackendDispatch, BackendMount, BackendResult, ExecutionBackend

log = logging.getLogger("worker.backends.kubernetes")

_PVC_VOLUME = "data"


def parse_mount_map(raw: str) -> list[tuple[str, str]]:
    """Parse ``hostPrefix=subPath`` pairs; longest prefix first so nested
    prefixes resolve deterministically (first entry wins between duplicates)."""
    pairs: list[tuple[str, str]] = []
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        prefix, sep, sub_path = item.partition("=")
        prefix = prefix.strip().rstrip("/")
        sub_path = sub_path.strip().strip("/")
        if not sep or not prefix or not sub_path:
            raise ValueError(f"invalid mount map entry: {item!r}")
        pairs.append((prefix, sub_path))
    pairs.sort(key=lambda p: len(p[0]), reverse=True)
    return pairs


def resolve_mounts(
    mounts: Sequence[BackendMount], mount_map: list[tuple[str, str]]
) -> tuple[list[dict], list[dict]]:
    """Translate dispatch mounts into ``(volumeMounts, extra volumes)``.

    Two source forms are supported:
    - ``pvc://<claim>[/subpath]`` mounts the named PersistentVolumeClaim
      (used by static volumes such as the CryoSat sad/ tree — the API's
      DPMC_STATIC_VOLUMES value carries the backend-appropriate source).
    - a plain path is resolved through *mount_map* onto the shared workdir
      PVC via subPath. A path outside the map is a hard error: running with
      a missing input dir would produce confusing in-job failures.
    """
    out: list[dict] = []
    volumes: list[dict] = []
    claimed: dict[str, str] = {}
    for m in mounts:
        if m.source.startswith("pvc://"):
            claim, _, sub_path = m.source[len("pvc://") :].rstrip("/").partition("/")
            if not claim:
                raise ValueError(f"pvc:// mount source without a claim: {m.source}")
            name = claimed.get(claim)
            if name is None:
                name = f"pvc-{claim}"
                claimed[claim] = name
                volumes.append(
                    {"name": name, "persistentVolumeClaim": {"claimName": claim}}
                )
            vm = {"name": name, "mountPath": m.target}
            if sub_path:
                vm["subPath"] = sub_path
            if m.read_only:
                vm["readOnly"] = True
            out.append(vm)
            continue
        source = m.source.rstrip("/")
        for prefix, sub_path in mount_map:
            if source == prefix or source.startswith(prefix + "/"):
                rel = source[len(prefix) :].lstrip("/")
                vm = {
                    "name": _PVC_VOLUME,
                    "mountPath": m.target,
                    "subPath": f"{sub_path}/{rel}" if rel else sub_path,
                }
                if m.read_only:
                    vm["readOnly"] = True
                out.append(vm)
                break
        else:
            raise ValueError(f"mount source outside mount map: {m.source}")
    return out, volumes


def parse_tolerations(raw: str) -> list[dict]:
    """Parse the ``DPMC_K8S_JOB_TOLERATIONS`` JSON list (empty = none)."""
    if not raw.strip():
        return []
    try:
        tolerations = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid k8s job tolerations JSON: {exc}") from exc
    if not isinstance(tolerations, list) or not all(
        isinstance(t, dict) for t in tolerations
    ):
        raise ValueError("k8s job tolerations must be a JSON list of objects")
    return tolerations


def build_job_manifest(
    job_id: int,
    dispatch: BackendDispatch,
    *,
    mount_map: list[tuple[str, str]],
    pvc_name: str,
    image_pull_secret: str,
    ttl_s: int,
    tolerations: list[dict] | None = None,
    run_as_uid: int = 1000,
) -> dict:
    """Build a ``batch/v1 Job`` manifest dict for *dispatch*.

    Raises ``ValueError`` if *dispatch.image* is ``None``.
    """
    if dispatch.image is None:
        raise ValueError("KubernetesBackend requires an image")

    limits: dict[str, str] = {}
    if dispatch.cpus:
        limits["cpu"] = f"{dispatch.cpus:g}"  # 2.0 -> "2", 0.5 -> "0.5"
    if dispatch.memory_bytes:
        limits["memory"] = str(dispatch.memory_bytes)
    if dispatch.gpus:
        limits["nvidia.com/gpu"] = str(len(dispatch.gpus))

    volume_mounts, extra_volumes = resolve_mounts(dispatch.mounts, mount_map)

    container: dict = {
        "name": "job",
        "image": dispatch.image,
        # Always re-pull: processing images use mutable tags (e.g. :development),
        # for which k8s defaults to IfNotPresent — a node that cached an older
        # build of the same tag would silently run stale code. Digest-pinned
        # images (imageUrl@sha256) make this a cheap no-op.
        "imagePullPolicy": "Always",
        # args (not command): `docker run IMAGE CMD` overrides CMD and keeps
        # the image ENTRYPOINT — k8s `args` has the same semantics.
        "args": list(dispatch.command),
        "env": [{"name": k, "value": str(v)} for k, v in dispatch.env.items()],
        "volumeMounts": volume_mounts,
        # requests == limits: mirrors `docker run --cpus/--memory` semantics.
        "resources": {"requests": dict(limits), "limits": limits},
        "securityContext": {
            "allowPrivilegeEscalation": False,
            "capabilities": {"drop": ["ALL"]},
        },
    }
    pod_spec: dict = {
        "restartPolicy": "Never",
        "containers": [container],
        # PodSecurity "restricted" compliance; forcing the uid also lets
        # root-built processing images pass runAsNonRoot, and fsGroup keeps
        # the shared PVC workdir writable by worker and job alike.
        "securityContext": {
            "runAsNonRoot": True,
            "runAsUser": run_as_uid,
            "runAsGroup": run_as_uid,
            "fsGroup": run_as_uid,
            "seccompProfile": {"type": "RuntimeDefault"},
        },
        "volumes": [
            {"name": _PVC_VOLUME, "persistentVolumeClaim": {"claimName": pvc_name}},
            *extra_volumes,
        ],
    }
    if image_pull_secret:
        pod_spec["imagePullSecrets"] = [{"name": image_pull_secret}]
    if tolerations:
        # Job pods don't inherit the worker Deployment's tolerations; on a
        # fully-tainted cluster they would stay Unschedulable without these.
        pod_spec["tolerations"] = tolerations

    labels = {"app": "dpmc-job", "dpmc/job-id": str(job_id)}
    return {
        "apiVersion": "batch/v1",
        "kind": "Job",
        "metadata": {"name": f"dpmc-job-{job_id}", "labels": labels},
        "spec": {
            "backoffLimit": 0,
            "ttlSecondsAfterFinished": ttl_s,
            "template": {"metadata": {"labels": labels}, "spec": pod_spec},
        },
    }


_START_POLL_INTERVAL_S = 2.0
_TERMINATION_POLL_INTERVAL_S = 2.0
# Consecutive poll failures tolerated before we cancel the job and give up:
# a transient API blip must not fail an hours-long run, but a dead API must
# not leave DPMC reporting "running" for a workload we can't observe.
_POLL_ERROR_BUDGET = 5
_SA_NAMESPACE_FILE = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
_METRICS_INTERVAL_S = 5.0


class _Aggregate:
    """Mutated by the sampler thread, read once after it stops."""

    def __init__(self) -> None:
        self.cpu_core_seconds: float = 0.0
        self.peak_memory_bytes: int = 0
        self.sampled: bool = False


def _sample_pod_metrics(metrics_api, namespace: str, pod_name: str) -> tuple[float, int]:
    """One ``metrics.k8s.io`` reading: (cores in use, memory bytes)."""
    obj = metrics_api.get_namespaced_custom_object(
        "metrics.k8s.io", "v1beta1", namespace, "pods", pod_name
    )
    cores = 0.0
    memory = 0
    for c in obj.get("containers", []):
        usage = c.get("usage", {})
        cores += float(parse_quantity(usage.get("cpu", "0")))
        memory += int(parse_quantity(usage.get("memory", "0")))
    return cores, memory


def _metrics_loop(
    metrics_api, namespace: str, pod_name: str, agg: _Aggregate, stop: threading.Event
) -> None:
    # Known best-effort bias: the first window integrates only the HTTP
    # round-trip (dt ≈ 0) and the tail between the last sample and stop is
    # never integrated — short jobs under-count, and the runner's 1-core
    # floor (cpu_seconds=None) covers the no-sample case instead.
    last = time.monotonic()
    while True:
        try:
            cores, memory = _sample_pod_metrics(metrics_api, namespace, pod_name)
        except Exception:
            # metrics-server absent or pod gone — quiet, best-effort. Keep
            # the exception in DEBUG so a code bug is distinguishable from
            # a missing metrics API.
            log.debug("pod metrics unavailable for %s", pod_name, exc_info=True)
        else:
            now = time.monotonic()
            agg.cpu_core_seconds += cores * (now - last)
            agg.peak_memory_bytes = max(agg.peak_memory_bytes, memory)
            agg.sampled = True
            last = now
        if stop.wait(_METRICS_INTERVAL_S):
            return


def _sa_namespace() -> str:
    try:
        return Path(_SA_NAMESPACE_FILE).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


class KubernetesBackend(ExecutionBackend):
    name = "Kubernetes"

    def __init__(self, config, *, batch_api=None, core_api=None, metrics_api=None) -> None:
        self._config = config
        self._namespace = config.k8s_namespace or _sa_namespace() or "default"
        self._mount_map = parse_mount_map(config.k8s_mount_map)
        self._tolerations = parse_tolerations(config.k8s_job_tolerations)
        self._batch = batch_api
        self._core = core_api
        self._metrics = metrics_api
        self._init_lock = threading.Lock()

    def _ensure_clients(self) -> None:
        """Lazy in-cluster init so unit tests can inject fakes and the module
        imports without a kubeconfig. Locked: concurrent runner slots can hit
        their first job at the same time."""
        if self._batch is not None:
            return
        with self._init_lock:
            if self._batch is not None:
                return
            self._init_clients()

    def _init_clients(self) -> None:
        from kubernetes import client as k8s_client
        from kubernetes import config as k8s_config

        k8s_config.load_incluster_config()
        cfg = k8s_client.Configuration.get_default_copy()
        # TCP keepalive: without it a silently dropped connection hangs the
        # log follow stream forever on quiet long-running jobs.
        cfg.socket_options = [
            (socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1),
            (socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60),
            (socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 30),
            (socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 3),
        ]
        api = k8s_client.ApiClient(cfg)
        self._core = k8s_client.CoreV1Api(api)
        self._metrics = k8s_client.CustomObjectsApi(api)
        # _batch last: it is the lazy-init guard and cancel() may race run()
        # from another thread.
        self._batch = k8s_client.BatchV1Api(api)

    def run(
        self,
        job_id: int,
        dispatch: BackendDispatch,
        log_sink: Callable[[str], None],
    ) -> BackendResult:
        self._ensure_clients()
        manifest = build_job_manifest(
            job_id,
            dispatch,
            mount_map=self._mount_map,
            pvc_name=self._config.k8s_pvc_name,
            image_pull_secret=self._config.k8s_image_pull_secret,
            ttl_s=self._config.k8s_job_ttl_s,
            tolerations=self._tolerations,
            run_as_uid=self._config.k8s_job_run_as_uid,
        )
        try:
            self._batch.create_namespaced_job(namespace=self._namespace, body=manifest)
        except ApiException as exc:
            if exc.status != 409:
                raise
            # Leftover job from a previous worker run (crash + re-dispatch):
            # replace it instead of adopting stale pods/logs/exit codes.
            log.warning("job dpmc-job-%s already exists — replacing", job_id)
            self._delete_job_and_wait(job_id)
            self._batch.create_namespaced_job(namespace=self._namespace, body=manifest)

        pod_name = self._wait_for_pod_start(job_id)

        agg = _Aggregate()
        stop = threading.Event()
        sampler = threading.Thread(
            target=_metrics_loop,
            args=(self._metrics, self._namespace, pod_name, agg, stop),
            name=f"dpmc-k8s-sampler-{job_id}",
            daemon=True,
        )
        sampler.start()
        try:
            self._stream_logs(pod_name, log_sink)
            exit_code = self._wait_terminated(job_id, pod_name)
        finally:
            stop.set()
            # Daemon thread: if the join times out mid-HTTP-call, reading
            # agg below is still safe under CPython's GIL (float/int stores
            # are atomic); the late sample is simply lost.
            sampler.join(timeout=2.0)

        # No explicit delete: ttlSecondsAfterFinished cleans up, and the Job
        # stays inspectable right after a failure.
        return BackendResult(
            exit_code=exit_code,
            cpu_seconds=agg.cpu_core_seconds if agg.sampled else None,
            peak_rss_bytes=agg.peak_memory_bytes if agg.sampled else None,
        )

    def cancel(self, job_id: int) -> None:
        self._ensure_clients()
        try:
            self._batch.delete_namespaced_job(
                name=f"dpmc-job-{job_id}",
                namespace=self._namespace,
                propagation_policy="Background",
            )
        except ApiException as exc:
            if exc.status == 404:
                log.debug("job dpmc-job-%s already gone", job_id)
            else:
                log.warning("delete job dpmc-job-%s failed: %s", job_id, exc)
        except Exception as exc:
            log.warning("delete job dpmc-job-%s failed: %s", job_id, exc)

    def _delete_job_and_wait(self, job_id: int) -> None:
        """Foreground-delete a stale job and wait until it and its pods are
        gone, so the recreate below cannot pick up stale state."""
        try:
            self._batch.delete_namespaced_job(
                name=f"dpmc-job-{job_id}",
                namespace=self._namespace,
                propagation_policy="Foreground",
            )
        except ApiException as exc:
            if exc.status != 404:
                raise
        deadline = time.monotonic() + self._config.k8s_start_timeout_s
        while time.monotonic() < deadline:
            if not self._pods(job_id) and not self._job_exists(job_id):
                return
            time.sleep(_START_POLL_INTERVAL_S)
        raise RuntimeError(f"stale job dpmc-job-{job_id} did not go away in time")

    def _job_exists(self, job_id: int) -> bool:
        try:
            self._batch.read_namespaced_job(
                name=f"dpmc-job-{job_id}", namespace=self._namespace
            )
        except ApiException as exc:
            if exc.status == 404:
                return False
            raise
        return True

    def _pods(self, job_id: int):
        return self._core.list_namespaced_pod(
            namespace=self._namespace, label_selector=f"dpmc/job-id={job_id}"
        ).items

    def _wait_for_pod_start(self, job_id: int) -> str:
        deadline = time.monotonic() + self._config.k8s_start_timeout_s
        reason = "no pod scheduled"
        errors = 0
        while time.monotonic() < deadline:
            try:
                pods = self._pods(job_id)
            except ApiException as exc:
                errors += 1
                if errors >= _POLL_ERROR_BUDGET:
                    self.cancel(job_id)
                    raise RuntimeError(
                        f"kubernetes API unavailable while waiting for pod start: {exc.reason}"
                    ) from exc
                time.sleep(_START_POLL_INTERVAL_S)
                continue
            errors = 0
            if pods:
                pod = pods[0]
                if pod.status.phase in ("Running", "Succeeded", "Failed"):
                    return pod.metadata.name
                for cs in pod.status.container_statuses or []:
                    if cs.state.waiting is not None and cs.state.waiting.reason:
                        reason = cs.state.waiting.reason
            time.sleep(_START_POLL_INTERVAL_S)
        self.cancel(job_id)
        raise RuntimeError(f"job pod failed to start within timeout: {reason}")

    def _stream_logs(self, pod_name: str, log_sink: Callable[[str], None]) -> None:
        # NB: not watch.Watch().stream(read_namespaced_pod_log) — Watch injects
        # watch=True, which read_namespaced_pod_log rejects ("unexpected keyword
        # argument 'watch'"). Follow the raw byte stream and split into lines.
        try:
            resp = self._core.read_namespaced_pod_log(
                name=pod_name,
                namespace=self._namespace,
                follow=True,
                _preload_content=False,
            )
        except Exception as exc:
            # Logs are best-effort; the exit code below stays authoritative.
            log.warning("log stream for %s could not start: %s", pod_name, exc)
            return
        buf = b""
        try:
            for chunk in resp.stream(amt=4096):
                buf += chunk
                *lines, buf = buf.split(b"\n")
                for line in lines:
                    log_sink(line.decode("utf-8", "replace").rstrip())
            if buf:
                log_sink(buf.decode("utf-8", "replace").rstrip())
        except Exception as exc:
            log.warning("log stream for %s interrupted: %s", pod_name, exc)
        finally:
            resp.release_conn()

    def _wait_terminated(self, job_id: int, pod_name: str) -> int:
        errors = 0
        while True:
            try:
                pod = self._core.read_namespaced_pod(
                    name=pod_name, namespace=self._namespace
                )
            except ApiException as exc:
                if exc.status == 404:
                    # Pod gone before we observed termination: cancelled from
                    # another thread, or reaped by a (too short) job TTL.
                    log.warning("pod %s disappeared before termination", pod_name)
                    return 1
                errors += 1
                if errors >= _POLL_ERROR_BUDGET:
                    self.cancel(job_id)
                    raise RuntimeError(
                        f"kubernetes API unavailable while supervising job: {exc.reason}"
                    ) from exc
                time.sleep(_TERMINATION_POLL_INTERVAL_S)
                continue
            errors = 0
            for cs in pod.status.container_statuses or []:
                if cs.state.terminated is not None:
                    return int(cs.state.terminated.exit_code)
            if pod.status.phase == "Failed":
                # Evicted/Deleted without a terminated state.
                log.warning(
                    "pod %s failed without terminated state (reason=%s)",
                    pod_name,
                    getattr(pod.status, "reason", None),
                )
                return 1
            time.sleep(_TERMINATION_POLL_INTERVAL_S)
