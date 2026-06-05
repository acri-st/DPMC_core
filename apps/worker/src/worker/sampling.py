"""Pure helpers to sample /proc/<pid>/{io,stat,status} on Linux.

These are mocked in unit tests by monkeypatching `Path.read_text`.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class IoSample:
    read_bytes: int
    write_bytes: int


@dataclass
class CpuSample:
    """Cumulative user + system CPU time in clock ticks."""

    utime_ticks: int
    stime_ticks: int

    @property
    def total_ticks(self) -> int:
        return self.utime_ticks + self.stime_ticks


def sample_io(pid: int, *, root: Path = Path("/")) -> IoSample | None:
    """Read /proc/<pid>/io. Returns None when the file doesn't exist (process exited)."""
    try:
        text = (root / "proc" / str(pid) / "io").read_text(encoding="utf-8")
    except OSError:
        return None
    read = 0
    write = 0
    for line in text.splitlines():
        if line.startswith("read_bytes:"):
            read = int(line.split(":", 1)[1].strip())
        elif line.startswith("write_bytes:"):
            write = int(line.split(":", 1)[1].strip())
    return IoSample(read_bytes=read, write_bytes=write)


def sample_cpu(pid: int, *, root: Path = Path("/")) -> CpuSample | None:
    """Read /proc/<pid>/stat. Fields 14 (utime) and 15 (stime) are clock ticks."""
    try:
        text = (root / "proc" / str(pid) / "stat").read_text(encoding="utf-8")
    except OSError:
        return None
    # Parse around the comm field (which can contain spaces / parens).
    end = text.rfind(")")
    if end == -1:
        return None
    rest = text[end + 1:].strip().split()
    # rest[0] is state, then 11 more fields lead to utime/stime indices 11/12 (0-based).
    if len(rest) < 13:
        return None
    return CpuSample(utime_ticks=int(rest[11]), stime_ticks=int(rest[12]))


def sample_rss_bytes(pid: int, *, root: Path = Path("/")) -> int | None:
    """Read VmRSS from /proc/<pid>/status (kB → bytes)."""
    try:
        text = (root / "proc" / str(pid) / "status").read_text(encoding="utf-8")
    except OSError:
        return None
    for line in text.splitlines():
        if line.startswith("VmRSS:"):
            parts = line.split()
            if len(parts) >= 2:
                return int(parts[1]) * 1024
    return None


def clock_ticks_per_second() -> int:
    """SC_CLK_TCK — usually 100 on Linux."""
    import os

    try:
        return int(os.sysconf("SC_CLK_TCK"))
    except (ValueError, OSError):
        return 100
