"""S3 stage-in / stage-out for the worker.

Pure functions: given a job working directory and a list of stage entries,
download (stage-in) or upload (stage-out) from/to S3. The runner orchestrates
when to call these; the API tells *what* to stage via the dispatch payload.

The contract intentionally takes raw URLs / keys rather than Product rows, so
the worker stays ignorant of DB shape — the API translates Product.url into
the entries below at dispatch time.
"""

from __future__ import annotations

import glob as glob_module
import logging
import os
from dataclasses import dataclass
from typing import TYPE_CHECKING
from urllib.parse import urlparse

import boto3
from botocore.client import Config as BotoConfig

if TYPE_CHECKING:
    from worker.config import S3Config

log = logging.getLogger("worker.staging")


@dataclass(frozen=True)
class StageInEntry:
    """One file to stage before the job runs.

    Either ``url`` (S3 URI) or ``content`` (inline string) must be set.
    ``local_name`` is the path relative to the job working directory where
    the bytes are written; subdirectories are created as needed.
    """

    local_name: str
    url: str | None = None
    content: str | None = None
    role: str | None = None


@dataclass(frozen=True)
class StageOutEntry:
    """One file to upload after the job runs.

    The worker uploads ``<workdir>/<local_name>`` to ``s3://<bucket>/<key>``
    and returns the resulting metadata so the API can register a Product.
    ``role`` is opaque to the worker; it's echoed back in the result.
    """

    key: str
    local_name: str
    role: str | None = None
    content_type: str | None = None


@dataclass(frozen=True)
class StageOutResult:
    role: str | None
    local_name: str
    key: str
    size: int


def build_s3_client(cfg: S3Config):
    """Construct a boto3 S3 client from worker S3 settings."""
    return boto3.client(
        "s3",
        endpoint_url=cfg.endpoint,
        region_name=cfg.region,
        aws_access_key_id=cfg.access_key,
        aws_secret_access_key=cfg.secret_key,
        config=BotoConfig(
            s3={"addressing_style": "path" if cfg.force_path_style else "auto"},
        ),
    )


def _parse_s3_url(url: str) -> tuple[str, str]:
    """Return ``(bucket, key)`` for an ``s3://bucket/key`` URL."""
    parsed = urlparse(url)
    if parsed.scheme != "s3":
        raise ValueError(f"Not an s3:// URL: {url!r}")
    if not parsed.netloc:
        raise ValueError(f"Missing bucket in S3 URL: {url!r}")
    key = parsed.path.lstrip("/")
    if not key:
        raise ValueError(f"Missing key in S3 URL: {url!r}")
    return parsed.netloc, key


def stage_in(s3, entries: list[StageInEntry], workdir: str) -> int:
    """Stage every entry into ``workdir/<local_name>``, returning total bytes.

    Content entries (``entry.content`` is set) are written directly as UTF-8
    text. URL entries are downloaded from S3.

    The byte total is what DPMC bills as the job's `ingress` concern. It is
    measured on the staged file rather than taken from the declaration,
    because the declaration carries no size and the catalogue's recorded size
    can drift from what is actually on the object store.
    """
    os.makedirs(workdir, exist_ok=True)
    total_bytes = 0
    for entry in entries:
        dest = os.path.join(workdir, entry.local_name)
        os.makedirs(os.path.dirname(dest) or workdir, exist_ok=True)
        if entry.content is not None:
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(entry.content)
            log.info("stage-in content → %s", dest)
        else:
            bucket, key = _parse_s3_url(entry.url)
            log.info("stage-in s3://%s/%s → %s", bucket, key, dest)
            s3.download_file(bucket, key, dest)
        try:
            total_bytes += os.path.getsize(dest)
        except OSError:
            # Never fail a job over a metric: a missing file here would have
            # already broken the download above.
            log.warning("could not size staged file %s", dest)
    return total_bytes


def stage_out(
    s3,
    bucket: str,
    entries: list[StageOutEntry],
    workdir: str,
) -> list[StageOutResult]:
    """Upload every entry from ``workdir/<local_name>``.

    If ``local_name`` contains a ``*`` wildcard the pattern is expanded with
    :func:`glob.glob` and each matched file is uploaded individually. The S3
    key is built by replacing the ``*`` portion of ``entry.key`` with the
    matched basename (or by appending the basename when ``entry.key`` ends
    with ``/``). Exact-match entries that are missing are skipped with a
    warning.
    """
    results: list[StageOutResult] = []
    for entry in entries:
        extra: dict[str, str] = {}
        if entry.content_type:
            extra["ContentType"] = entry.content_type

        if "*" in entry.local_name:
            pattern = os.path.join(workdir, entry.local_name)
            matched = sorted(glob_module.glob(pattern))
            if not matched:
                log.warning("stage-out glob matched nothing: %s (role=%s)", pattern, entry.role)
            for local_path in matched:
                basename = os.path.basename(local_path)
                rel = os.path.relpath(local_path, workdir)
                # Build the S3 key: treat entry.key as a prefix when it ends
                # with '/' or contains '*', otherwise use it verbatim.
                if entry.key.endswith("/") or "*" in entry.key:
                    key_prefix = entry.key.rstrip("/").split("*")[0].rstrip("/")
                    out_key = f"{key_prefix}/{basename}"
                else:
                    out_key = entry.key
                log.info("stage-out (glob) %s → s3://%s/%s", local_path, bucket, out_key)
                s3.upload_file(local_path, bucket, out_key, ExtraArgs=extra or None)
                results.append(
                    StageOutResult(
                        role=entry.role,
                        local_name=rel,
                        key=out_key,
                        size=os.path.getsize(local_path),
                    )
                )
        else:
            local_path = os.path.join(workdir, entry.local_name)
            if not os.path.exists(local_path):
                log.warning(
                    "stage-out skipped: %s not produced (role=%s)",
                    local_path,
                    entry.role,
                )
                continue
            log.info("stage-out %s → s3://%s/%s", local_path, bucket, entry.key)
            s3.upload_file(local_path, bucket, entry.key, ExtraArgs=extra or None)
            results.append(
                StageOutResult(
                    role=entry.role,
                    local_name=entry.local_name,
                    key=entry.key,
                    size=os.path.getsize(local_path),
                )
            )
    return results
