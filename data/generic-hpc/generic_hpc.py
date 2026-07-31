#!/usr/bin/env python3
"""Submit an arbitrary job to the HPC via the broker, then poll until a terminal state.

Generic counterpart of data/cryosat: nothing mission-specific. The broker URL and
the HPC script path come from the Batch parameters (Task parameters), fetched at
runtime from the DPMC API — so a single image serves any HPC submission. CLI flags
are kept as a fallback for standalone/local runs.

Parameter resolution (highest precedence first):
  1. Batch.parametersIn  (GET /worker/batches/<id>/inputs, when running under the worker)
  2. CLI flags / built-in defaults

The broker exposes a REST API:
  POST /jobs          -> creates a job (status QUEUED)
  GET  /jobs/{id}     -> current job state
The broker-side poller transitions the job QUEUED -> RUNNING -> DONE/ERROR.

Usage (local):
  python generic_hpc.py --broker-url http://localhost:8000 --script-path /lustre/.../hello-world.sh
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

TERMINAL_STATES = {"DONE", "ERROR"}

DEFAULT_BROKER_URL = "http://localhost:8000"
DEFAULT_SCRIPT_PATH = "/lustre/projects/1031/generic/hello-world.sh"
CPU = 16
MEMORY = 64
MAX_DURATION = 24
MESSAGE = "Generic HPC job"
INTERVAL = 5.0
TIMEOUT = 3600.0


def _request(
    method: str,
    url: str,
    payload: dict | None = None,
    headers: dict | None = None,
    timeout: float = 30.0,
) -> dict:
    """Small HTTP wrapper based on the stdlib (no external dependencies)."""
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
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


def create_job(broker_url: str, body: dict) -> dict:
    return _request("POST", f"{broker_url}/jobs", payload=body)


def get_job(broker_url: str, job_id: str) -> dict:
    return _request("GET", f"{broker_url}/jobs/{job_id}")


def poll_until_terminal(
    broker_url: str, job_id: str, interval: float, timeout: float
) -> dict:
    """Poll the broker until a terminal state (DONE/ERROR) or until timeout expires.

    Logs one line per poll so progress is visible live (the broker has no streaming
    endpoint, so "live" means re-reading GET /jobs/{id} every `interval`s).
    """
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
    parser = argparse.ArgumentParser(description="Submit a job via the HPC broker and track its status.")
    parser.add_argument("--broker-url", default=None, help="Broker base URL")
    parser.add_argument("--script-path", default=None, help="Path of the script to execute on the HPC")
    parser.add_argument("--name", default=None, help="Job name (unique). Default: job-<short uuid>")
    args = parser.parse_args()

    # Batch parameters (from the Task) win over CLI flags / defaults.
    params = fetch_parameters()
    broker_url = params.get("brokerUrl") or args.broker_url or DEFAULT_BROKER_URL
    script_path = params.get("scriptPath") or args.script_path or DEFAULT_SCRIPT_PATH
    name = params.get("name") or args.name or f"job-{uuid.uuid4().hex[:8]}"

    body = {
        "name": name,
        "cpu": int(params.get("cpu", CPU)),
        "memory": int(params.get("memory", MEMORY)),
        "max_duration": int(params.get("maxDuration", MAX_DURATION)),
        "script_path": script_path,
        "message": params.get("message", MESSAGE),
        "metadata": {
            "client": "generic_hpc.py",
            "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        },
    }

    print(f"→ Submitting job '{name}' to broker {broker_url} (script {script_path}) ...")
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
