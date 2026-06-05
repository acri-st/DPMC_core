from __future__ import annotations

from pathlib import Path

from worker.sampling import (
    IoSample,
    sample_cpu,
    sample_io,
    sample_rss_bytes,
)


def test_sample_io_parses_proc_io(tmp_path: Path) -> None:
    proc = tmp_path / "proc" / "100"
    proc.mkdir(parents=True)
    (proc / "io").write_text(
        "rchar: 1\nwchar: 2\nsyscr: 3\nsyscw: 4\nread_bytes: 4096\nwrite_bytes: 8192\ncancelled_write_bytes: 0\n"
    )
    assert sample_io(100, root=tmp_path) == IoSample(read_bytes=4096, write_bytes=8192)


def test_sample_io_returns_none_when_missing(tmp_path: Path) -> None:
    assert sample_io(999, root=tmp_path) is None


def test_sample_cpu_handles_comm_with_parens(tmp_path: Path) -> None:
    proc = tmp_path / "proc" / "100"
    proc.mkdir(parents=True)
    # Synthetic /proc/100/stat with utime=10, stime=4 (positions 14 and 15 in the spec)
    fields = ["100", "(my prog)", "S"] + ["0"] * 10 + ["10", "4"] + ["0"] * 30
    (proc / "stat").write_text(" ".join(fields))
    cpu = sample_cpu(100, root=tmp_path)
    assert cpu is not None
    assert cpu.utime_ticks == 10 and cpu.stime_ticks == 4
    assert cpu.total_ticks == 14


def test_sample_rss_bytes(tmp_path: Path) -> None:
    proc = tmp_path / "proc" / "100"
    proc.mkdir(parents=True)
    (proc / "status").write_text("Name:\tprog\nVmRSS:\t  2048 kB\n")
    assert sample_rss_bytes(100, root=tmp_path) == 2048 * 1024


def test_sample_rss_bytes_missing_returns_none(tmp_path: Path) -> None:
    assert sample_rss_bytes(999, root=tmp_path) is None
