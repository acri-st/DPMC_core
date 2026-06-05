import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

export type RelativeTimeInput = Date | string | number | null | undefined;

/**
 * Pick a refresh interval based on how old the value is. The closer to "now",
 * the more frequently we tick — so we never lag visibly on fresh values but
 * also avoid pointless re-renders on stale ones.
 */
function getRefreshInterval(ageMs: number): number {
  const abs = Math.abs(ageMs);
  if (abs < 60_000) return 1_000; // < 1 min  → tick every second
  if (abs < 3_600_000) return 30_000; // < 1 hour → tick every 30 s
  if (abs < 86_400_000) return 60_000; // < 1 day  → tick every minute
  return 3_600_000; // > 1 day  → tick every hour
}

export function formatRelativeTime(
  date: RelativeTimeInput,
  fallback: string = 'never',
): string {
  if (date == null) return fallback;
  const ts = typeof date === 'number' ? date : new Date(date).getTime();
  if (!Number.isFinite(ts)) return fallback;

  const ageMs = Date.now() - ts;
  if (ageMs < 0) {
    // Future timestamps (clock skew between worker and API): clamp to "just now".
    return 'just now';
  }

  const sec = Math.floor(ageMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1m ago' : `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1h ago' : `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? '1d ago' : `${day}d ago`;

  // Months / years are rare for our use cases — fall back to date-fns.
  return formatDistanceToNow(new Date(ts), { addSuffix: true });
}

/**
 * React hook that returns a live "X ago" label for ``date`` and re-renders
 * itself at smart intervals so the displayed value stays accurate without the
 * caller having to wire a timer.
 */
export function useRelativeTime(
  date: RelativeTimeInput,
  fallback: string = 'never',
): string {
  const stamp =
    date == null
      ? null
      : typeof date === 'number'
        ? date
        : new Date(date).getTime();

  const [, force] = useState(0);

  useEffect(() => {
    if (stamp == null || !Number.isFinite(stamp)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const ageMs = Date.now() - stamp;
      timer = setTimeout(() => {
        force((t) => t + 1);
        schedule();
      }, getRefreshInterval(ageMs));
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [stamp]);

  return formatRelativeTime(stamp, fallback);
}
