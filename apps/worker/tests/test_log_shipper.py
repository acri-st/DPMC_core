"""Unit tests for ``worker.log_shipper``."""

from __future__ import annotations

import logging
import time
from collections import deque
from threading import Lock
from typing import Any
from unittest.mock import MagicMock

from worker.api import ApiError
from worker.log_shipper import (
    LogShipper,
    _BufferingHandler,
    _level_to_api,
)


def test_level_mapping_matches_api_enum() -> None:
    assert _level_to_api(logging.DEBUG) == "Debug"
    assert _level_to_api(logging.INFO) == "Info"
    assert _level_to_api(logging.WARNING) == "Warning"
    assert _level_to_api(logging.ERROR) == "Error"
    assert _level_to_api(logging.CRITICAL) == "Critical"
    # Custom intermediate levels round down to the nearest known one.
    assert _level_to_api(logging.INFO + 5) == "Info"
    assert _level_to_api(logging.CRITICAL + 100) == "Critical"


def _make_handler() -> tuple[_BufferingHandler, deque[dict[str, Any]]]:
    buf: deque[dict[str, Any]] = deque(maxlen=3)
    handler = _BufferingHandler(buf, Lock())
    handler.setFormatter(logging.Formatter("%(message)s"))
    return handler, buf


def _make_record(name: str, level: int, msg: str) -> logging.LogRecord:
    return logging.LogRecord(
        name=name,
        level=level,
        pathname="-",
        lineno=0,
        msg=msg,
        args=None,
        exc_info=None,
    )


def test_handler_appends_records_with_iso_timestamp() -> None:
    handler, buf = _make_handler()

    handler.emit(_make_record("worker", logging.INFO, "hello"))

    assert len(buf) == 1
    entry = buf[0]
    assert entry["level"] == "Info"
    assert entry["message"] == "hello"
    assert entry["loggedAt"].endswith("+00:00")


def test_handler_drops_oldest_when_buffer_is_full() -> None:
    handler, buf = _make_handler()  # maxlen=3

    for i in range(5):
        handler.emit(_make_record("worker", logging.INFO, f"msg-{i}"))

    assert [e["message"] for e in buf] == ["msg-2", "msg-3", "msg-4"]


def test_handler_skips_internal_logger_to_avoid_feedback_loop() -> None:
    handler, buf = _make_handler()

    handler.emit(_make_record("worker.log_shipper", logging.WARNING, "self"))

    assert len(buf) == 0


def test_handler_skips_http_client_logs_to_avoid_shipping_feedback_loop() -> None:
    handler, buf = _make_handler()

    handler.emit(
        _make_record(
            "httpx",
            logging.INFO,
            'HTTP Request: POST http://api.test/host/host-1/logs "HTTP/1.1 200 OK"',
        )
    )
    handler.emit(_make_record("httpcore.connection", logging.DEBUG, "connect_tcp"))

    assert len(buf) == 0


def test_shipper_drains_buffer_in_batches() -> None:
    api = MagicMock()
    api.ingest_logs.return_value = {"accepted": 2}

    shipper = LogShipper(
        api,
        1,
        flush_interval_s=10.0,  # high so the bg thread doesn't kick in
        batch_size=2,
        buffer_max=10,
    )

    for i in range(5):
        shipper._handler.emit(_make_record("worker", logging.INFO, f"m{i}"))
    shipper._drain_once()

    assert api.ingest_logs.call_count == 3  # 2 + 2 + 1
    sent: list[dict[str, Any]] = []
    for call in api.ingest_logs.call_args_list:
        host_id, batch = call.args
        assert host_id == 1
        sent.extend(batch)
    # Default formatter includes the logger name for UI context.
    assert [e["message"] for e in sent] == [
        "worker: m0",
        "worker: m1",
        "worker: m2",
        "worker: m3",
        "worker: m4",
    ]


def test_shipper_requeues_batch_on_api_error() -> None:
    api = MagicMock()
    api.ingest_logs.side_effect = ApiError(503, "down")

    shipper = LogShipper(
        api,
        1,
        flush_interval_s=10.0,
        batch_size=2,
        buffer_max=10,
    )

    for i in range(2):
        shipper._handler.emit(_make_record("worker", logging.INFO, f"m{i}"))
    shipper._drain_once()

    # One failed attempt, batch put back at the front (still 2 entries buffered)
    assert api.ingest_logs.call_count == 1
    with shipper._lock:
        assert [e["message"] for e in shipper._buffer] == [
            "worker: m0",
            "worker: m1",
        ]


def test_start_attaches_handler_and_stop_detaches_it() -> None:
    api = MagicMock()
    api.ingest_logs.return_value = {"accepted": 0}

    shipper = LogShipper(
        api,
        1,
        flush_interval_s=0.05,
        batch_size=10,
        buffer_max=10,
    )
    root = logging.getLogger()
    handlers_before = list(root.handlers)
    previous_level = root.level
    root.setLevel(logging.DEBUG)

    shipper.start()
    try:
        assert shipper._handler in root.handlers
        logging.getLogger("worker").info("from-test")
        deadline = time.monotonic() + 1.0
        while time.monotonic() < deadline and api.ingest_logs.call_count == 0:
            time.sleep(0.02)
        assert api.ingest_logs.call_count >= 1
    finally:
        shipper.stop()
        root.setLevel(previous_level)

    assert shipper._handler not in root.handlers
    assert list(root.handlers) == handlers_before


def test_stop_does_a_final_drain_for_pending_entries() -> None:
    api = MagicMock()
    api.ingest_logs.return_value = {"accepted": 0}

    shipper = LogShipper(
        api,
        1,
        flush_interval_s=10.0,
        batch_size=10,
        buffer_max=10,
    )
    root = logging.getLogger()
    previous_level = root.level
    root.setLevel(logging.DEBUG)

    shipper.start()
    try:
        logging.getLogger("worker").info("late entry")
    finally:
        shipper.stop()
        root.setLevel(previous_level)

    assert api.ingest_logs.call_count >= 1
    delivered: list[str] = []
    for call in api.ingest_logs.call_args_list:
        _, batch = call.args
        delivered.extend(e["message"] for e in batch)
    assert any("late entry" in m for m in delivered)
