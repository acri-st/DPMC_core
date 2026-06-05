"""Background log shipper.

Captures records from the Python logging system and flushes them in batches to
``POST /host/:id/logs`` on the DPMC API.

Design notes:

- Best-effort, in-memory only: if the API is unreachable for long enough that
  the buffer fills up, the oldest entries are dropped (FIFO) and a single
  warning is logged locally.
- The shipper runs on its own daemon thread so the main worker loop is never
  blocked by HTTP latency.
- The shipper itself logs through ``logging`` but uses a dedicated logger name
  excluded from shipping to avoid feedback loops.
- ``current_job_id`` is a ContextVar set by the runner around ``backend.run``
  so each LogRecord captured during that window carries the job's id; the
  API attaches it to ``host_log.jobId`` and the BatchDetailPage filters on it.
"""

from __future__ import annotations

import logging
import threading
from collections import deque
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from worker.api import ApiError, WorkerApi

# Track the job currently being executed on this worker. The runner sets it
# around `backend.run` so any log line emitted while the IPF container is
# running (the streamed stdout lines, sampler warnings, ...) is tagged with
# the right job id. Stays None for system logs (registration, heartbeat).
current_job_id: ContextVar[int | None] = ContextVar(
    "current_job_id", default=None
)

_EXCLUDED_LOGGER_PREFIXES = ("worker.log_shipper", "httpx", "httpcore")
_PYTHON_TO_API_LEVEL: dict[int, str] = {
    logging.DEBUG: "Debug",
    logging.INFO: "Info",
    logging.WARNING: "Warning",
    logging.ERROR: "Error",
    logging.CRITICAL: "Critical",
}

_internal = logging.getLogger("worker.log_shipper")


def _level_to_api(level: int) -> str:
    """Map a stdlib logging level to the API's HostLogLevel enum."""
    if level >= logging.CRITICAL:
        return "Critical"
    if level >= logging.ERROR:
        return "Error"
    if level >= logging.WARNING:
        return "Warning"
    if level >= logging.INFO:
        return "Info"
    return "Debug"


class _BufferingHandler(logging.Handler):
    """Push every record into a bounded thread-safe deque."""

    def __init__(self, buffer: deque[dict[str, Any]], lock: threading.Lock) -> None:
        super().__init__()
        self._buffer = buffer
        self._lock = lock
        self._dropped = 0

    def emit(self, record: logging.LogRecord) -> None:
        if record.name.startswith(_EXCLUDED_LOGGER_PREFIXES):
            return
        try:
            payload: dict[str, Any] = {
                "level": _level_to_api(record.levelno),
                "message": self.format(record),
                "loggedAt": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            }
            # Snapshot the runner-provided context. ContextVar lookup is
            # cheap and safe across threads (each thread sees its own value
            # since the runner runs the IPF on the same thread).
            job_id = current_job_id.get()
            if job_id is not None:
                payload["jobId"] = job_id
        except Exception:
            return
        with self._lock:
            if len(self._buffer) >= self._buffer.maxlen:
                self._buffer.popleft()
                self._dropped += 1
                if self._dropped == 1 or self._dropped % 100 == 0:
                    _internal.warning(
                        "log shipper buffer full, dropped %d entries so far",
                        self._dropped,
                    )
            self._buffer.append(payload)


class LogShipper:
    """Owns the background flush thread + the buffering handler.

    Lifecycle::

        shipper = LogShipper(api, host_id, ...)
        shipper.start()
        ...
        shipper.stop()

    ``start()`` attaches the buffering handler to the root logger. ``stop()``
    detaches it, drains the buffer once, and joins the flush thread.
    """

    def __init__(
        self,
        api: WorkerApi,
        host_id: int,
        *,
        flush_interval_s: float,
        batch_size: int,
        buffer_max: int,
        formatter: logging.Formatter | None = None,
    ) -> None:
        self._api = api
        self._host_id = host_id
        self._flush_interval_s = flush_interval_s
        self._batch_size = batch_size
        self._buffer: deque[dict[str, Any]] = deque(maxlen=buffer_max)
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._handler = _BufferingHandler(self._buffer, self._lock)
        self._handler.setFormatter(
            formatter or logging.Formatter("%(name)s: %(message)s")
        )

    def start(self) -> None:
        if self._thread is not None:
            return
        logging.getLogger().addHandler(self._handler)
        self._thread = threading.Thread(
            target=self._run, name="worker-log-shipper", daemon=True
        )
        self._thread.start()

    def stop(self, *, timeout_s: float = 2.0) -> None:
        if self._thread is None:
            return
        self._stop.set()
        self._thread.join(timeout=timeout_s)
        self._thread = None
        logging.getLogger().removeHandler(self._handler)
        self._drain_once()

    def _run(self) -> None:
        while not self._stop.wait(self._flush_interval_s):
            self._drain_once()

    def _drain_once(self) -> None:
        while True:
            batch = self._take_batch()
            if not batch:
                return
            try:
                self._api.ingest_logs(self._host_id, batch)
            except ApiError as exc:
                # Re-queue at the front so we don't lose data on transient
                # failures. If the buffer is at maxlen, the oldest entries get
                # dropped on insert (FIFO contract).
                with self._lock:
                    for entry in reversed(batch):
                        if len(self._buffer) >= self._buffer.maxlen:
                            break
                        self._buffer.appendleft(entry)
                _internal.warning("log shipping failed: %s", exc)
                return

    def _take_batch(self) -> list[dict[str, Any]]:
        with self._lock:
            if not self._buffer:
                return []
            n = min(self._batch_size, len(self._buffer))
            return [self._buffer.popleft() for _ in range(n)]
