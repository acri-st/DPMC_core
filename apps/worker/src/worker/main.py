"""Worker entry point — register the host, heartbeat, mark off on shutdown."""

from __future__ import annotations

import logging
import platform
import shutil
import signal
import socket
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from worker.api import ApiError, WorkerApi
from worker.config import S3Config, WorkerConfig
from worker.log_shipper import LogShipper
from worker.runner import Runner
from worker.staging import build_s3_client

logger = logging.getLogger("worker")


def collect_facts(config: WorkerConfig) -> dict[str, Any]:
    """Return the body expected by ``POST /host/register``.

    Uses only the standard library: ``os``, ``platform``, ``socket``, ``shutil``
    and ``/proc/*`` files on Linux. No ``psutil`` dependency.
    """
    nb_cores = _cpu_count()
    return {
        "dataCenterCode": config.data_center_code,
        "hostname": _hostname(),
        "ipAddress": _primary_ip(),
        "osType": _os_type(),
        "osVersion": platform.release() or "0",
        "processingDir": config.processing_dir,
        "cacheDir": config.cache_dir,
        "nbCores": nb_cores,
        "ram": _ram_bytes(),
        "disk": _disk_bytes(),
        "schedulingPriority": config.scheduling_priority,
        "hasGpu": False,
        "gpuCount": 0,
        "gpuModel": None,
        "containerRuntime": _detect_container_runtime(config),
    }


def _detect_container_runtime(config: WorkerConfig) -> str:
    """Return the runtime this host can actually launch, or 'None'.

    Why: a worker container reports the runtime its host's daemon can run,
    not what's installed inside its own image. In kubernetes mode the
    cluster IS the runtime — we report "Kubernetes", a host-only capability
    the dispatcher treats as satisfying Docker (OCI) requirements, so
    existing Docker Tasks dispatch unchanged; see the k8s backend design doc.
    """
    if config.execution_backend == "kubernetes":
        return "Kubernetes" if _k8s_api_reachable(config) else "None"
    if Path("/var/run/docker.sock").exists() and shutil.which("docker"):
        try:
            subprocess.run(
                ["docker", "version", "--format", "{{.Server.Version}}"],
                check=True,
                capture_output=True,
                timeout=3,
            )
            return "Docker"
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
            pass
    if shutil.which("apptainer"):
        return "Apptainer"
    return "None"


def _k8s_api_reachable(config: WorkerConfig) -> bool:
    """True when the k8s API answers AND the ServiceAccount may create Jobs.

    The RBAC check matters: /version is open to any authenticated caller, so
    without it a worker whose Role was never applied would register as
    "Kubernetes" and then 403 on every dispatch instead of registering "None".
    """
    try:
        from kubernetes import client as k8s_client
        from kubernetes import config as k8s_config

        from worker.backends.kubernetes import _sa_namespace

        k8s_config.load_incluster_config()
        namespace = config.k8s_namespace or _sa_namespace() or "default"
        ssar = k8s_client.V1SelfSubjectAccessReview(
            spec=k8s_client.V1SelfSubjectAccessReviewSpec(
                resource_attributes=k8s_client.V1ResourceAttributes(
                    verb="create",
                    group="batch",
                    resource="jobs",
                    namespace=namespace,
                )
            )
        )
        resp = k8s_client.AuthorizationV1Api().create_self_subject_access_review(ssar)
        if not resp.status.allowed:
            logger.error(
                "kubernetes mode: ServiceAccount may not create Jobs in %s "
                "(Role/RoleBinding not applied?)",
                namespace,
            )
            return False
        return True
    except Exception as exc:
        logger.error("kubernetes mode requested but API unreachable: %s", exc)
        return False


class Worker:
    """Owns the API client and the keep-alive loop."""

    def __init__(self, config: WorkerConfig) -> None:
        self._config = config
        self._api = WorkerApi(
            config.api_url, config.worker_token, timeout=config.http_timeout_s
        )
        self._shutdown = threading.Event()
        self._host_id: int | None = None
        self._shipper: LogShipper | None = None
        self._runner: Runner | None = None
        self._runner_threads: list[threading.Thread] = []

    def run(self) -> int:
        signal.signal(signal.SIGTERM, self._on_signal)
        signal.signal(signal.SIGINT, self._on_signal)

        try:
            self._register()
        except ApiError as exc:
            logger.error("Registration failed: %s", exc)
            return 1

        if self._config.log_shipping_enabled and self._host_id:
            self._shipper = LogShipper(
                self._api,
                self._host_id,
                flush_interval_s=self._config.log_flush_interval_s,
                batch_size=self._config.log_batch_size,
                buffer_max=self._config.log_buffer_max,
            )
            self._shipper.start()

        if self._config.runner_enabled and self._host_id:
            s3_client, s3_bucket = _try_build_s3()
            backends = None
            if self._config.execution_backend == "kubernetes":
                from worker.backends.kubernetes import KubernetesBackend

                # The dispatch payload's `runtime` is the script's *artifact*
                # type ("Docker" = OCI image), not the host capability. This
                # host advertises capability "Kubernetes"; it serves those
                # Docker artifacts by running them as k8s Jobs, hence the
                # KubernetesBackend is keyed by the artifact it serves.
                backends = {"Docker": KubernetesBackend(self._config)}
            self._runner = Runner(
                self._api,
                self._host_id,
                poll_interval_s=self._config.runner_poll_interval_s,
                backends=backends,
                s3_client=s3_client,
                s3_bucket=s3_bucket,
            )
            slots = self._config.runner_slots
            logger.info("Starting %d runner slot(s)", slots)
            for i in range(slots):
                t = threading.Thread(
                    target=self._runner.run,
                    name=f"dpmc-worker-runner-{i}",
                    daemon=True,
                )
                t.start()
                self._runner_threads.append(t)

        try:
            self._keepalive_loop()
        finally:
            if self._runner is not None:
                self._runner.stop()
            for t in self._runner_threads:
                t.join(timeout=5)
            if self._shipper is not None:
                self._shipper.stop()
            self._mark_off()
            self._api.close()
        return 0

    def _register(self) -> None:
        facts = collect_facts(self._config)
        logger.info(
            "Registering host hostname=%s dc=%s cores=%d ram=%d disk=%d",
            facts["hostname"],
            facts["dataCenterCode"],
            facts["nbCores"],
            facts["ram"],
            facts["disk"],
        )
        host = self._api.register(facts)
        self._host_id = host.get("id") if isinstance(host, dict) else None
        if not self._host_id:
            raise ApiError(0, "API did not return a host id")
        logger.info("Registered host id=%s", self._host_id)

    def _keepalive_loop(self) -> None:
        interval = self._config.heartbeat_interval_s
        logger.info("Heartbeat loop every %.1fs", interval)
        while not self._shutdown.wait(interval):
            assert self._host_id is not None
            try:
                self._api.heartbeat(self._host_id)
                logger.info("Heartbeat sent host=%s", self._host_id)
            except ApiError as exc:
                logger.warning("Heartbeat failed: %s", exc)
                if exc.status_code == 404:
                    logger.info("Host gone server-side, re-registering")
                    try:
                        self._register()
                    except ApiError as re_exc:
                        logger.error("Re-registration failed: %s", re_exc)

    def _mark_off(self) -> None:
        if not self._host_id:
            return
        logger.info("Marking host %s as Off", self._host_id)
        try:
            self._api.update_status(self._host_id, "Off")
        except ApiError as exc:
            logger.warning("Failed to mark host as Off: %s", exc)

    def _on_signal(self, *_args: object) -> None:
        logger.info("Shutdown signal received")
        self._shutdown.set()


def _try_build_s3() -> tuple[Any | None, str | None]:
    """Construct an S3 client if env vars are set; warn and skip otherwise.

    The worker stays usable without S3 (legacy bind-mount flow). If staging
    is requested by the API but no S3 is configured, ``Runner._execute``
    fails the job with an explicit reason rather than corrupting outputs.
    """
    try:
        s3_cfg = S3Config()  # type: ignore[call-arg]
    except ValidationError as exc:
        logger.warning("S3 config missing — staging disabled: %s", exc)
        return None, None
    return build_s3_client(s3_cfg), s3_cfg.bucket


def main() -> int:
    """Synchronous entry point. Returns the process exit code."""
    try:
        config = WorkerConfig()  # type: ignore[call-arg]
    except ValidationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr, flush=True)
        return 2

    logging.basicConfig(
        level=config.log_level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    try:
        return Worker(config).run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        return 130


def _hostname() -> str:
    return socket.gethostname() or platform.node() or "unknown"


def _primary_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _os_type() -> str:
    system = platform.system()
    if system in ("Linux", "Darwin", "Windows"):
        return system
    return "Linux"


def _cpu_count() -> int:
    import os

    return os.cpu_count() or 1


def _ram_bytes() -> int:
    try:
        with Path("/proc/meminfo").open(encoding="utf-8") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    return int(line.split()[1]) * 1024
    except OSError:
        pass
    return 0


def _disk_bytes() -> int:
    try:
        return int(shutil.disk_usage("/").total)
    except OSError:
        return 0
