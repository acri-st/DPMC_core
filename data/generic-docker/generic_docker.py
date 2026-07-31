#!/usr/bin/env python3
"""Run an arbitrary command inside this container — the in-cluster counterpart of generic-hpc.

Where generic-hpc offloads work to the HPC via the broker, this runs the work directly
in the job's Kubernetes pod (same backend as Warhol). The command to run comes from the
Batch parameters (Task parameters), fetched at runtime from the DPMC API, so a single
baked image serves any containerised command. A CLI flag is kept for standalone runs.

Parameter resolution (highest precedence first):
  1. Batch.parametersIn  (GET /worker/batches/<id>/inputs, when running under the worker)
  2. --command CLI flag / built-in default

Usage (local):
  python generic_docker.py --command "echo hello && python -c 'print(1+1)'"
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

DEFAULT_COMMAND = "echo 'hello from generic-docker'"


def _request(method: str, url: str, headers: dict | None = None, timeout: float = 30.0) -> dict:
    """Small HTTP wrapper based on the stdlib (no external dependencies)."""
    req = urllib.request.Request(url, method=method)
    req.add_header("Accept", "application/json")
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
    call fails, so the CLI flag / default still applies for local runs. Mirrors the
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
        print(f"! could not fetch batch parameters, falling back to CLI/default: {e}", file=sys.stderr)
        return {}
    data = body.get("data", body)
    return data.get("parametersIn") or {}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an arbitrary command in this container.")
    parser.add_argument("--command", default=None, help="Shell command to execute")
    args = parser.parse_args()

    # Batch parameter (from the Task) wins over the CLI flag / default.
    params = fetch_parameters()
    command = params.get("command") or args.command or DEFAULT_COMMAND

    print(f"→ [{time.strftime('%H:%M:%S')}] running: {command}")
    start = time.monotonic()
    # shell=True so the parameter can be a full pipeline; the child inherits this
    # process's stdout/stderr, so its output streams live (PYTHONUNBUFFERED keeps
    # our own prints unbuffered too).
    result = subprocess.run(command, shell=True)
    elapsed = time.monotonic() - start

    print(f"\n=== exit {result.returncode} (after {elapsed:.1f}s) ===")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
