/**
 * Compute the duration in milliseconds between two ISO date strings.
 * Returns null when either bound is missing or invalid.
 */
export function durationBetween(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start) return null;
  const s = new Date(start).getTime();
  if (!Number.isFinite(s)) return null;
  const e = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(e)) return null;
  return Math.max(0, e - s);
}

/**
 * Format a millisecond duration as a compact human-readable string.
 *   1234         => "1.2s"
 *   65000        => "1m 05s"
 *   3725000      => "1h 02m"
 *   90000000     => "1d 01h"
 */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${totalSec}.${tenths}s`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec.toString().padStart(2, '0')}s`;
  const hours = Math.floor(min / 60);
  const mm = min % 60;
  if (hours < 24) return `${hours}h ${mm.toString().padStart(2, '0')}m`;
  const days = Math.floor(hours / 24);
  const hh = hours % 24;
  return `${days}d ${hh.toString().padStart(2, '0')}h`;
}
