from __future__ import annotations

from unittest.mock import MagicMock

from worker.backends.base import BackendResult, ExecutionBackend
from worker.runner import Runner


class _FakeBackend(ExecutionBackend):
    name = "Docker"

    def __init__(self) -> None:
        self.runs: list[int] = []

    def run(self, job_id, dispatch, log_sink) -> BackendResult:  # type: ignore[override]
        self.runs.append(job_id)
        return BackendResult(exit_code=0, cpu_seconds=1.0)

    def cancel(self, job_id) -> None:  # type: ignore[override]
        pass


def _stop_after(runner: Runner, *payloads):
    """Return a side-effect list that stops the runner after the given payloads.

    After the last payload the next call returns None and the runner's stop
    event is set so the loop terminates cleanly — no timer race condition.
    """
    calls = list(payloads)

    def _effect(_host_id):
        if calls:
            return calls.pop(0)
        runner.stop()
        return None

    return _effect


def test_runner_runs_dispatched_job_then_stops() -> None:
    api = MagicMock()
    payload = {
        "jobId": 1,
        "image": "busybox",
        "runtime": "Docker",
        "command": [],
        "env": {},
        "mounts": [],
        "resources": {"cpus": 1, "memoryBytes": "1000000000", "gpus": []},
    }
    api.next_job.side_effect = _stop_after(
        # runner is created below; we pass it in via the helper closure
        None,  # placeholder, replaced below
        payload,
    )
    api.report_result.return_value = {}

    backend = _FakeBackend()
    # Build runner, then wire up the stop-after helper properly.
    runner = Runner(api, 42, poll_interval_s=0.0, backends={"Docker": backend})
    api.next_job.side_effect = _stop_after(runner, payload)

    runner.run()

    assert backend.runs == [1]
    api.report_result.assert_called_once()
    args, _ = api.report_result.call_args
    host_id, job_id, body = args
    assert host_id == 42 and job_id == 1 and body["status"] == "Success"


def test_runner_reports_failure_when_runtime_not_supported() -> None:
    api = MagicMock()
    api.report_result.return_value = {}

    runner = Runner(api, 42, poll_interval_s=0.0, backends={})
    api.next_job.side_effect = _stop_after(
        runner,
        {"jobId": 2, "runtime": "Slurm", "image": "x", "command": [], "env": {}, "mounts": [], "resources": {}},
    )

    runner.run()

    api.report_result.assert_called_once()
    body = api.report_result.call_args[0][2]
    assert body["status"] == "Failed"
