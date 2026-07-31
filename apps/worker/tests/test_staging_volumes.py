"""Transfer volumes reported for the ingress/egress carbon concerns."""

from __future__ import annotations

import os
from unittest.mock import MagicMock

from worker.staging import StageInEntry, stage_in


def test_stage_in_returns_total_bytes_for_content_entries(tmp_path) -> None:
    staged = stage_in(
        MagicMock(),
        [
            StageInEntry(local_name="a.txt", content="hello"),
            StageInEntry(local_name="sub/b.txt", content="worldd"),
        ],
        str(tmp_path),
    )

    assert staged == 11
    assert os.path.exists(tmp_path / "sub" / "b.txt")


def test_stage_in_measures_downloaded_files_not_declarations(tmp_path) -> None:
    """The size comes off the staged file, so a catalogue entry whose recorded
    size has drifted from the object store cannot skew the footprint."""

    def _download(_bucket, _key, dest):
        with open(dest, "wb") as fh:
            fh.write(b"x" * 2048)

    s3 = MagicMock()
    s3.download_file.side_effect = _download

    staged = stage_in(
        s3,
        [StageInEntry(local_name="in.dat", url="s3://bucket/in.dat")],
        str(tmp_path),
    )

    assert staged == 2048


def test_stage_in_of_nothing_is_zero_not_none(tmp_path) -> None:
    """A job whose script self-fetches its inputs reports 0, which the API
    reads as 'no transfer measured here' rather than as a missing metric."""
    assert stage_in(MagicMock(), [], str(tmp_path)) == 0
