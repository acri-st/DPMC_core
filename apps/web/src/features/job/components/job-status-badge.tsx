import type { JobStatus } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

const STYLES: Record<JobStatus, { dot: string; text: string }> = {
  Waiting: { dot: 'bg-slate-400', text: 'text-slate-600' },
  Ready: { dot: 'bg-violet-500', text: 'text-violet-600' },
  Running: { dot: 'bg-sky-500', text: 'text-sky-600' },
  Success: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Failed: { dot: 'bg-rose-500', text: 'text-rose-600' },
  Skipped: { dot: 'bg-zinc-400', text: 'text-zinc-500' },
  Cancelled: { dot: 'bg-amber-500', text: 'text-amber-600' },
};

type JobStatusBadgeProps = {
  status: JobStatus;
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const style = STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5', style.text, 'border-current/30')}
    >
      <span className={cn('inline-block size-1.5 rounded-full', style.dot)} />
      {status}
    </Badge>
  );
}
