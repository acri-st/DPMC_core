/**
 * Format a byte value into a human-readable string using binary (1024-based)
 * units (KiB, MiB, GiB, TiB).
 * Accepts number or numeric string. Falls back to "—" for non-finite input.
 */
export function formatBytes(
  value: number | bigint | string | null | undefined,
): string {
  if (value === null || value === undefined) return '—';
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'bigint'
        ? Number(value)
        : Number(value);
  if (!Number.isFinite(num) || num <= 0) return '0 B';

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let i = 0;
  let n = num;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const fixed =
    i === 0 ? n.toFixed(0) : n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2);
  return `${fixed} ${units[i]}`;
}
