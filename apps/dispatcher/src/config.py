"""Pydantic-Settings config for the DPMC dispatcher."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class DispatcherConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DPMC_DISPATCHER_",
        env_file=".env",
        extra="ignore",
    )

    database_url: str
    api_url: str = "http://localhost:3000/api"
    api_token: str = ""

    task_loop_interval_s: float = 5.0
    dependency_loop_interval_s: float = 5.0
    dispatch_loop_interval_s: float = 2.0
    monitor_loop_interval_s: float = 5.0
    aging_loop_interval_s: float = 30.0
    watcher_loop_interval_s: float = 30.0
    finalizer_loop_interval_s: float = 5.0
    heartbeat_interval_s: float = 15.0
    metrics_loop_interval_s: float = 30.0

    monitor_lost_host_threshold_s: float = 120.0

    recovery_on_startup: bool = True

    # Retry policy for infra-failed jobs (host lost). `max_attempts` is the
    # total number of times a job may run before it is left terminally Failed.
    # Backoff before retry #n is base * multiplier**(n-1), clamped to cap.
    max_attempts: int = 3
    retry_backoff_base_s: float = 30.0
    retry_backoff_cap_s: float = 3600.0
    retry_backoff_multiplier: float = 2.0

    log_level: str = "INFO"
