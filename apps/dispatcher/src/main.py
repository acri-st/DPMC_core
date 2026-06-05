"""Run all dispatcher loops until killed."""

from __future__ import annotations

import asyncio
import logging

from config import DispatcherConfig
from services.runner import run_all

log = logging.getLogger("dispatcher")


def main() -> int:
    cfg = DispatcherConfig()  # type: ignore[call-arg]
    logging.basicConfig(
        level=getattr(logging, cfg.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    # Silence noisy HTTP client logs — the dispatcher logs the outcome of every
    # API call at its own layer (heartbeat warnings, expand failures, etc.).
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    log.info("dispatcher starting api_url=%s log_level=%s", cfg.api_url, cfg.log_level)
    asyncio.run(run_all(cfg))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
