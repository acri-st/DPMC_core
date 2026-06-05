from __future__ import annotations

from unittest.mock import MagicMock, patch

from worker.backends.base import BackendDispatch, BackendMount
from worker.backends.docker import DockerBackend


def _dispatch(**over):
    return BackendDispatch(
        image="busybox:latest",
        command=["echo", "hi"],
        env={"FOO": "bar"},
        mounts=[
            BackendMount(source="/src", target="/dst"),
            BackendMount(source="/ro", target="/ro", read_only=True),
        ],
        cpus=2.0,
        memory_bytes=4_000_000_000,
        gpus=[],
        **over,
    )


@patch("worker.backends.docker._resolve_pid", return_value=None)
@patch("worker.backends.docker.subprocess.Popen")
def test_docker_run_builds_correct_command(popen_mock: MagicMock, _resolve_mock: MagicMock) -> None:
    proc = MagicMock()
    proc.stdout = iter(["line one\n", "line two\n"])
    proc.returncode = 0
    proc.wait = MagicMock()
    popen_mock.return_value = proc

    backend = DockerBackend()
    sink_lines: list[str] = []

    backend.run(1, _dispatch(), lambda line: sink_lines.append(line))

    args, _ = popen_mock.call_args
    cmd = args[0]
    assert cmd[:4] == ["docker", "run", "--rm", "--name"]
    assert "dpmc-1" in cmd
    assert "--cpus" in cmd and "2.0" in cmd
    assert "--memory" in cmd and "4000000000" in cmd
    assert "-e" in cmd and "FOO=bar" in cmd
    assert "-v" in cmd and "/src:/dst" in cmd
    assert "/ro:/ro:ro" in cmd
    assert cmd[-3:] == ["busybox:latest", "echo", "hi"]
    assert sink_lines == ["line one", "line two"]


@patch("worker.backends.docker._resolve_pid", return_value=None)
@patch("worker.backends.docker.subprocess.Popen")
def test_docker_run_returns_backend_result_with_metric_fields(popen_mock: MagicMock, _resolve_mock: MagicMock) -> None:
    proc = MagicMock()
    proc.stdout = iter([])
    proc.returncode = 0
    proc.wait = MagicMock()
    popen_mock.return_value = proc

    backend = DockerBackend()
    result = backend.run(1, _dispatch(), lambda _line: None)

    assert result.exit_code == 0
    assert result.peak_rss_bytes is None
    assert result.disk_read_bytes is None
    assert result.disk_write_bytes is None
