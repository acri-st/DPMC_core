import { format } from 'date-fns';
import type { ReactNode } from 'react';

import { HostLogLevelBadge } from '@/features/host/components/host-log-level-badge';
import type { HostLogEntry } from '@/features/host/services/host-logs.service';

type Props = {
  log: HostLogEntry;
  search: string;
};

export function HostLogRow({ log, search }: Props) {
  const ts = format(new Date(log.loggedAt), 'HH:mm:ss.SSS');
  return (
    <div className="hover:bg-muted/30 grid grid-cols-[88px_72px_1fr] items-start gap-2 border-b px-3 py-1 font-mono text-[12px]">
      <span className="text-muted-foreground" title={log.loggedAt}>
        {ts}
      </span>
      <HostLogLevelBadge level={log.level} />
      <span className="whitespace-pre-wrap break-words">
        {highlight(log.message, search)}
      </span>
    </div>
  );
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const q = query.toLowerCase();
  const out: ReactNode[] = [];
  let cursor = 0;
  const lower = text.toLowerCase();
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      out.push(text.slice(cursor));
      break;
    }
    if (idx > cursor) out.push(text.slice(cursor, idx));
    out.push(
      <mark
        key={idx}
        className="bg-amber-200 text-amber-900 dark:bg-amber-500/40 dark:text-amber-100"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return out;
}
