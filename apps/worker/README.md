# DPMC Worker

Lightweight Python agent deployed on every execution host. It registers itself
with the DPMC API on startup, sends a heartbeat at a regular interval, and
marks the host as `Off` when it shuts down cleanly.

## Layout

```
apps/worker/
├── pyproject.toml
├── Dockerfile
├── .env.example
├── src/worker/
│   ├── __init__.py
│   ├── __main__.py        # `python -m worker`
│   ├── config.py          # WorkerConfig (DPMC_* env vars, pydantic-settings)
│   ├── api.py             # WorkerApi sync httpx client + ApiError
│   ├── log_shipper.py     # logging.Handler + background flush thread
│   └── main.py            # collect_facts() + Worker class + main()
└── tests/
    ├── conftest.py
    ├── test_api.py
    ├── test_log_shipper.py
    └── test_worker.py
```

## Lifecycle

1. `WorkerConfig()` reads `DPMC_*` env vars (and `.env` in dev). On validation
   error, the process exits with code `2`.
2. `logging.basicConfig` is initialized at the configured level.
3. `Worker.run()` installs SIGINT/SIGTERM handlers, then:
   - calls `POST /host/register` with the body produced by `collect_facts`,
   - if `DPMC_LOG_SHIPPING_ENABLED=true`, attaches a `LogShipper` to the root
     logger that batches records and POSTs them to `/host/:id/logs` every
     `DPMC_LOG_FLUSH_INTERVAL_S` seconds on a background thread,
   - enters a heartbeat loop calling `POST /host/:id/heartbeat` every
     `DPMC_HEARTBEAT_INTERVAL_S` seconds,
   - when a signal is received, stops the shipper (one final flush), calls
     `PATCH /host/:id/status` with `status=Off` and exits with code `0`.

If the API returns `404` on a heartbeat (host was deleted server-side), the
worker re-registers automatically.

The log shipper buffers entries in-memory; if the API is unreachable for too
long the oldest entries are dropped (FIFO) and a single warning is emitted
locally. There is no on-disk spool — logs are best-effort.

## Exit codes

| Code  | Meaning                                          |
| ----- | ------------------------------------------------ |
| `0`   | Clean shutdown                                   |
| `1`   | Registration failed                              |
| `2`   | Configuration error (missing or invalid env var) |
| `130` | Interrupted by user (Ctrl+C)                     |

## Environment variables

All variables use the `DPMC_` prefix.

| Variable                     | Required | Default  | Description                                                |
| ---------------------------- | -------- | -------- | ---------------------------------------------------------- |
| `DPMC_API_URL`               | yes      | —        | API base URL incl. global prefix.                          |
| `DPMC_WORKER_TOKEN`          | yes      | —        | Shared secret sent as `X-Worker-Token` (≥ 20).             |
| `DPMC_DATA_CENTER_CODE`      | yes      | —        | Must match an existing `DataCenter.code`.                  |
| `DPMC_PROCESSING_DIR`        | yes      | —        | Host processing directory path.                            |
| `DPMC_CACHE_DIR`             | yes      | —        | Host cache directory path.                                 |
| `DPMC_SCHEDULING_PRIORITY`   | no       | `Medium` | `Low` \| `Medium` \| `High`                                |
| `DPMC_HEARTBEAT_INTERVAL_S`  | no       | `30`     | Seconds between heartbeats.                                |
| `DPMC_HTTP_TIMEOUT_S`        | no       | `10`     | Per-request HTTP timeout.                                  |
| `DPMC_LOG_LEVEL`             | no       | `INFO`   | Standard logging level.                                    |
| `DPMC_LOG_SHIPPING_ENABLED`  | no       | `true`   | If `false`, logs stay local (stdout only).                 |
| `DPMC_LOG_FLUSH_INTERVAL_S`  | no       | `2`      | Seconds between batches sent to the API.                   |
| `DPMC_LOG_BATCH_SIZE`        | no       | `50`     | Max log entries per `POST /host/:id/logs` call (≤ 1000).   |
| `DPMC_LOG_BUFFER_MAX`        | no       | `5000`   | Max in-memory buffered entries; oldest are dropped (FIFO). |

## Commands

From the monorepo root:

```bash
pnpm --filter @dpmc/worker dev     # run the worker
pnpm --filter @dpmc/worker test    # run pytest
pnpm --filter @dpmc/worker lint    # ruff
```

From `apps/worker/`:

```bash
uv run --group dev python -m worker
uv run --group dev pytest
uv run --group dev ruff check .
```

## Tests

`httpx.MockTransport` is used everywhere — there are no live network calls.
