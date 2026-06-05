"""Retry policy for infrastructure-induced job failures.

A Job that fails because its host was lost — detected by the `monitor` loop
or by startup `recovery` — is retried with exponential backoff until it has
run `max_attempts` times, after which it is left terminally Failed and an
operator-facing escalation is logged.

Only infrastructure failures are retried here. A job that a worker reports as
Failed (a deterministic processing error) is set terminal by the API and is
deliberately out of scope: re-running it would just fail again.

`attempt` on the Job counts how many times the job has been started and lost.
A fresh job has `attempt = 0`; after its first failure `attempt = 1`, and so
on.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    """Caps and backoff curve for retrying infra-failed jobs."""

    max_attempts: int
    backoff_base_s: float
    backoff_cap_s: float
    backoff_multiplier: float

    def should_retry(self, attempt: int) -> bool:
        """True if a job that has now failed `attempt` times may run again.

        With `max_attempts = 3` the job runs at most three times: failures
        leaving `attempt` at 1 and 2 retry, the failure that reaches 3 gives
        up.
        """
        return attempt < self.max_attempts

    def backoff_for(self, attempt: int) -> float:
        """Seconds to wait before the retry that follows failure #`attempt`.

        Exponential: `base * multiplier**(attempt - 1)`, clamped to `cap`. The
        first retry (`attempt = 1`) waits `backoff_base_s`. Non-positive
        attempts wait 0s.
        """
        if attempt < 1:
            return 0.0
        raw = self.backoff_base_s * (self.backoff_multiplier ** (attempt - 1))
        return min(raw, self.backoff_cap_s)
