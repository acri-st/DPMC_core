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
    api_ssl_verify: bool = True

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
    max_attempts: int = 3
    log_level: str = "INFO"
