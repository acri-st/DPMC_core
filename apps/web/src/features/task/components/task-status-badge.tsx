import type { TaskStatus } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

const STYLES: Record<TaskStatus, { dot: string; text: string }> = {
  Edited: { dot: 'bg-slate-400', text: 'text-slate-600' },
  Queued: { dot: 'bg-sky-500', text: 'text-sky-600' },
  Running: { dot: 'bg-amber-500', text: 'text-amber-600' },
  Done: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Error: { dot: 'bg-rose-500', text: 'text-rose-600' },
  Suspended: { dot: 'bg-violet-500', text: 'text-violet-600' },
};

type TaskStatusBadgeProps = {
  status: TaskStatus;
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
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
