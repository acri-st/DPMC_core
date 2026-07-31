#!/usr/bin/env python3
"""Submit a CryoSat job to the HPC via the broker, then poll until a terminal state.

The broker exposes a REST API (see hpc-broker/src/routes/jobs.py):
  POST /jobs          -> creates a job (status QUEUED)
  GET  /jobs/{id}     -> current job state

The broker-side poller transitions the job QUEUED -> RUNNING -> DONE/ERROR.
This script submits the job, then queries the broker until these changes are observed.

Usage:
  python cryosat_hpc.py --script-path /lustre/projects/1031/scripts/cryosat_process.sh
  python cryosat_hpc.py --broker-url http://localhost:8000 --name cryosat-l2
"""

import argparse
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

TERMINAL_STATES = {"DONE", "ERROR"}

def _request(
    method: str,
    url: str,
    payload: dict | None = None,
    headers: dict | None = None,
    timeout: float = 30.0,
    raw: bool = False,
) -> dict | str:
    """Small HTTP wrapper based on the stdlib (no external dependencies).

    Returns parsed JSON by default; with `raw=True` returns the response body as
    text (used for fetching plain-text S3 objects)."""
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if not raw:
        req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
            if raw:
                return body
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"HTTP error {e.code} on {method} {url}: {detail}") from e
    except urllib.error.URLError as e:
        raise SystemExit(f"Could not reach {url}: {e.reason}") from e


def fetch_parameters() -> dict:
    """Best-effort fetch of Batch.parametersIn from the DPMC API.

    Returns {} when not running under the orchestrator (DPMC_* env unset) or if the
    call fails, so CLI flags / defaults still apply for local runs. Mirrors the
    dpmc_io contract: GET /worker/batches/<id>/inputs with the x-worker-token header.
    """
    api = os.environ.get("DPMC_API_URL")
    token = os.environ.get("DPMC_API_TOKEN")
    batch_id = os.environ.get("DPMC_BATCH_ID")
    if not (api and token and batch_id):
        return {}
    try:
        body = _request(
            "GET",
            f"{api.rstrip('/')}/worker/batches/{batch_id}/inputs",
            headers={"x-worker-token": token},
        )
    except SystemExit as e:
        print(f"! could not fetch batch parameters, falling back to CLI/defaults: {e}", file=sys.stderr)
        return {}
    data = body.get("data", body)
    return data.get("parametersIn") or {}


def _fetch_s3_object(url: str) -> str:
    """GET an `s3://bucket/key` object as text, authenticated with SigV4.

    Uses only the stdlib (hmac/hashlib) so the script keeps its "no pip deps"
    property — no boto3. Credentials and endpoint come from the S3_* env vars the
    worker injects into every job (see worker.service.ts). Path-style addressing
    is used, which is what MinIO expects.
    """
    parsed = urllib.parse.urlparse(url)
    bucket, key = parsed.netloc, parsed.path.lstrip("/")
    try:
        endpoint = os.environ["S3_ENDPOINT"].rstrip("/")
        access_key = os.environ["S3_ACCESS_KEY"]
        secret_key = os.environ["S3_SECRET_KEY"]
    except KeyError as e:
        raise SystemExit(f"Cannot read {url}: missing env var {e}") from e
    region = os.environ.get("S3_REGION", "us-east-1")

    host = urllib.parse.urlparse(endpoint).netloc
    canonical_uri = "/" + urllib.parse.quote(f"{bucket}/{key}", safe="/~")
    payload_hash = hashlib.sha256(b"").hexdigest()
    amz_date = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    datestamp = time.strftime("%Y%m%d", time.gmtime())

    canonical_headers = (
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(
        ["GET", canonical_uri, "", canonical_headers, signed_headers, payload_hash]
    )

    scope = f"{datestamp}/{region}/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            scope,
            hashlib.sha256(canonical_request.encode()).hexdigest(),
        ]
    )

    def _hmac(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    k_date = _hmac(f"AWS4{secret_key}".encode(), datestamp)
    k_region = _hmac(k_date, region)
    k_service = _hmac(k_region, "s3")
    k_signing = _hmac(k_service, "aws4_request")
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

    authorization = (
        f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return _request(
        "GET",
        f"{endpoint}{canonical_uri}",
        headers={
            "Authorization": authorization,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
        },
        raw=True,
    )


def read_product_list(list_path: str) -> list[str]:
    """Read a `.lst` manifest (one product per line) into a list of names.

    `list_path` may be a local filesystem path, an `s3://bucket/key` URL (fetched
    with SigV4 auth from the injected S3_* env), or an `http(s)://` URL — all read
    with the stdlib, so this script keeps its "no pip deps" property. Blank lines
    and `#` comments are skipped; surrounding whitespace is trimmed.
    """
    if list_path.startswith("s3://"):
        text = _fetch_s3_object(list_path)
    elif list_path.startswith(("http://", "https://")):
        try:
            with urllib.request.urlopen(list_path, timeout=30.0) as resp:
                text = resp.read().decode()
        except urllib.error.URLError as e:
            raise SystemExit(f"Could not read list from {list_path}: {e.reason}") from e
    else:
        try:
            with open(list_path, encoding="utf-8") as f:
                text = f.read()
        except OSError as e:
            raise SystemExit(f"Could not read list file {list_path}: {e}") from e

    products = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not products:
        raise SystemExit(f"List {list_path} contains no products")
    return products


def create_job(broker_url: str, body: dict) -> dict:
    return _request("POST", f"{broker_url}/jobs", payload=body)


def get_job(broker_url: str, job_id: str) -> dict:
    return _request("GET", f"{broker_url}/jobs/{job_id}")


def poll_until_terminal(
    broker_url: str, job_id: str, interval: float, timeout: float
) -> dict:
    """Poll the broker until a terminal state (DONE/ERROR) or until timeout expires."""
    deadline = time.monotonic() + timeout
    while True:
        job = get_job(broker_url, job_id)
        status = job["status"]
        hpc_id = job.get("hpc_id") or "-"
        print(f"  [{time.strftime('%H:%M:%S')}] poll -> status={status} hpc_id={hpc_id}")
        if status in TERMINAL_STATES:
            return job
        if time.monotonic() >= deadline:
            print(f"  timeout after {timeout:.0f}s, last known status: {status}", file=sys.stderr)
            return job
        time.sleep(interval)


def main() -> int:
    CPU = 4
    MEMORY = 8
    MAX_DURATION = 2
    MESSAGE = "CryoSat processing job"
    INTERVAL = 5.0
    TIMEOUT = 3600.0
    DEFAULT_BROKER_URL = "http://localhost:8000"
    DEFAULT_SCRIPT_PATH = "/lustre/projects/1031/scripts/cryosat_process.sh"
    DEFAULT_JOB_NAME = f"cryosat-{uuid.uuid4().hex[:8]}"

    parser = argparse.ArgumentParser(description="Submit a CryoSat job via the HPC broker and track its status.")
    parser.add_argument("--broker-url", default=None, help="Broker base URL")
    parser.add_argument("--name", default=None, help="Job name (unique). Default: cryosat-<short uuid>")
    parser.add_argument(
        "--script-path",
        default=None,
        help="Path of the script to execute on the HPC",
    )
    parser.add_argument(
        "--list-path",
        default=None,
        help="Path or http(s) URL of a .lst manifest (one product per line) to "
        "use as the job inputs. Overrides the built-in default list.",
    )

    args = parser.parse_args()

    params = fetch_parameters()
    broker_url = params.get("brokerUrl") or args.broker_url or DEFAULT_BROKER_URL
    script_path = params.get("scriptPath") or args.script_path or DEFAULT_SCRIPT_PATH
    name = params.get("name") or args.name or DEFAULT_JOB_NAME
    list_path = params.get("listPath") or args.list_path

    inputs: list[str] = []
    if list_path:
        inputs = read_product_list(list_path)
        print(f"→ Loaded {len(inputs)} products from list {list_path}")

    body = {
        "name": name,
        "cpu": CPU,
        "memory": MEMORY,
        "max_duration": MAX_DURATION,
        "script_path": script_path,
        "message": MESSAGE,
        "metadata": {
            "mission": "CryoSat-2",
            "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "inputs": inputs,
        },
    }

    print(f"→ Submitting job '{name}' to broker {broker_url} ...")
    job = create_job(broker_url, body)
    job_id = job["id"]
    print(f"✓ Job created: id={job_id} status={job['status']}")

    print(f"→ Polling every {INTERVAL:.0f}s (timeout {TIMEOUT:.0f}s) ...")
    final = poll_until_terminal(broker_url, job_id, INTERVAL, TIMEOUT)

    status = final["status"]
    print(f"\n=== Final result: {status} ===")
    if final.get("message"):
        print(f"message: {final['message']}")
    if final.get("logs"):
        print("--- logs ---")
        print(final["logs"])

    return 0 if status == "DONE" else 1


if __name__ == "__main__":
    raise SystemExit(main())
