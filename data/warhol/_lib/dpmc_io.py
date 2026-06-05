"""Shared I/O helpers for Warhol scripts.

Scripts call `fetch_inputs()` to discover their DatasetIn Products via the
DPMC API. Each Product carries its full media graph (one or more
MediaCatalogEntry, each pinned to a MediaCatalog on a Media backend), so the
script — not the orchestrator — decides how to retrieve the bytes. Call
`input.fetch(dest)` (or `retrieve(entry, dest)`) and the right backend
(S3 / HTTP / NFS) is picked from the entry's `media.type`.

Outputs are written to the `--output` path passed by the worker and uploaded
by the worker's stage-out machinery after the container exits.

Environment variables (injected by the worker):
- DPMC_API_URL, DPMC_API_TOKEN, DPMC_BATCH_ID
- S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
"""

from __future__ import annotations

import os
import shutil
import urllib.parse
from dataclasses import dataclass
from typing import Any

import boto3
import requests


@dataclass(frozen=True)
class Media:
    """Storage backend a catalog entry lives on."""

    type: str  # "S3" | "HTTP" | "HTTPS" | "NFS"
    name: str


@dataclass(frozen=True)
class MediaCatalogEntry:
    """A single retrievable artifact of a Product."""

    path: str
    size: int | None
    media: Media
    catalog_name: str

    def fetch(self, dest: str) -> str:
        retrieve(self, dest)
        return dest


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    product_type: str
    entries: list[MediaCatalogEntry]


@dataclass(frozen=True)
class Input:
    role: str
    product: Product

    # --- ergonomic accessors over the product graph ---
    @property
    def product_name(self) -> str:
        return self.product.name

    @property
    def product_type(self) -> str:
        return self.product.product_type

    @property
    def entries(self) -> list[MediaCatalogEntry]:
        return self.product.entries

    def fetch(self, dest: str) -> str:
        """Retrieve the product's primary media entry to `dest`, dispatching
        on its storage backend. Most products have a single entry."""
        if not self.product.entries:
            raise RuntimeError(
                f"Product {self.product.name!r} has no media entries to fetch"
            )
        return self.product.entries[0].fetch(dest)


@dataclass(frozen=True)
class BatchInputs:
    batch_id: str
    parameters: dict[str, Any]
    inputs: list[Input]


def _env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v


def fetch_inputs() -> BatchInputs:
    """GET /worker/batches/<batchId>/inputs and return a typed result."""
    api = _env("DPMC_API_URL").rstrip("/")
    token = _env("DPMC_API_TOKEN")
    batch_id = _env("DPMC_BATCH_ID")

    r = requests.get(
        f"{api}/worker/batches/{batch_id}/inputs",
        headers={"x-worker-token": token},
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    data = body.get("data", body)

    inputs = [_parse_input(i) for i in data.get("inputs", [])]
    return BatchInputs(
        batch_id=data["batchId"],
        parameters=data.get("parametersIn") or {},
        inputs=inputs,
    )


def _parse_input(raw: dict[str, Any]) -> Input:
    p = raw["product"]
    entries = []
    for wrap in p.get("mediaCatalogEntries", []):
        e = wrap["mediaCatalogEntry"]
        cat = e["mediaCatalog"]
        size = e.get("size")
        entries.append(
            MediaCatalogEntry(
                path=e["path"],
                size=int(size) if size is not None else None,
                media=Media(
                    type=str(cat["media"]["type"]).upper(),
                    name=cat["media"]["name"],
                ),
                catalog_name=cat["name"],
            )
        )
    return Input(
        role=raw["role"],
        product=Product(
            id=p["id"],
            name=p["name"],
            product_type=p["productType"]["acronym"],
            entries=entries,
        ),
    )


# --- retrieval, dispatched on the entry's storage backend --------------------


def retrieve(entry: MediaCatalogEntry, dest: str) -> None:
    """Download/copy a MediaCatalogEntry to a local path based on its backend."""
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    backend = entry.media.type.upper()
    if backend == "S3":
        _retrieve_s3(entry.path, dest)
    elif backend in ("HTTP", "HTTPS"):
        _retrieve_http(entry.path, dest)
    elif backend == "NFS":
        _retrieve_nfs(entry.path, dest)
    else:
        raise ValueError(
            f"Unsupported media backend {entry.media.type!r} for {entry.path!r}"
        )


_s3_client = None


def _s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=_env("S3_ENDPOINT"),
            region_name=os.environ.get("S3_REGION", "us-east-1"),
            aws_access_key_id=_env("S3_ACCESS_KEY"),
            aws_secret_access_key=_env("S3_SECRET_KEY"),
        )
    return _s3_client


def _retrieve_s3(url: str, dest: str) -> None:
    """Download an `s3://bucket/key` URL to a local path."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "s3":
        raise ValueError(f"Expected s3:// URL, got: {url}")
    _s3().download_file(parsed.netloc, parsed.path.lstrip("/"), dest)


def _retrieve_http(url: str, dest: str) -> None:
    """Stream an http(s):// URL to a local path."""
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def _retrieve_nfs(path: str, dest: str) -> None:
    """Copy a file from a mounted NFS share to a local path. `path` may be a
    plain filesystem path or an `nfs://host/abs/path` URL (host is the mount,
    already resolved into the container's filesystem)."""
    parsed = urllib.parse.urlparse(path)
    src = parsed.path if parsed.scheme == "nfs" else path
    shutil.copyfile(src, dest)
