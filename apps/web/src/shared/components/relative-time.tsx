import { format } from 'date-fns';

import {
  type RelativeTimeInput,
  useRelativeTime,
} from '@/shared/hooks/use-relative-time';

type RelativeTimeProps = {
  date: RelativeTimeInput;
  /**
   * String to render when ``date`` is null/undefined/invalid.
   * Defaults to "never".
   */
  fallback?: string;
  /**
   * If true, the absolute date is shown via ``title`` for a tooltip on hover.
   */
  withTooltip?: boolean;
  className?: string;
};

/**
 * Self-updating "X seconds/minutes/hours ago" label. Re-renders at adaptive
 * intervals — every second when the timestamp is recent, less frequently as
 * it ages.
 */
export function RelativeTime({
  date,
  fallback = 'never',
  withTooltip = true,
  className,
}: RelativeTimeProps) {
  const label = useRelativeTime(date, fallback);

  const tooltip =
    withTooltip && date != null
      ? (() => {
          const ts = typeof date === 'number' ? date : new Date(date).getTime();
          return Number.isFinite(ts) ? format(new Date(ts), 'PPpp') : undefined;
        })()
      : undefined;

  return (
    <span className={className} title={tooltip}>
      {label}
    </span>
  );
}
