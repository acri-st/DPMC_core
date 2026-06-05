from __future__ import annotations

from domain.retry import RetryPolicy

P = RetryPolicy(
    max_attempts=3, backoff_base_s=30.0, backoff_cap_s=3600.0, backoff_multiplier=2.0
)


def test_should_retry_until_max_attempts():
    assert P.should_retry(1)
    assert P.should_retry(2)
    assert not P.should_retry(3)
    assert not P.should_retry(4)


def test_backoff_is_exponential():
    assert P.backoff_for(1) == 30.0
    assert P.backoff_for(2) == 60.0
    assert P.backoff_for(3) == 120.0


def test_backoff_clamped_to_cap():
    p = RetryPolicy(
        max_attempts=10, backoff_base_s=30.0, backoff_cap_s=100.0, backoff_multiplier=2.0
    )
    assert p.backoff_for(1) == 30.0
    assert p.backoff_for(2) == 60.0
    assert p.backoff_for(3) == 100.0  # 120 clamped to cap
    assert p.backoff_for(8) == 100.0


def test_backoff_zero_for_nonpositive_attempt():
    assert P.backoff_for(0) == 0.0
    assert P.backoff_for(-1) == 0.0
