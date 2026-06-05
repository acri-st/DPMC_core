import type { BatchStatus } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

const STYLES: Record<BatchStatus, { dot: string; text: string }> = {
  Pending: { dot: 'bg-slate-400', text: 'text-slate-600' },
  Running: { dot: 'bg-sky-500', text: 'text-sky-600' },
  Success: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Failed: { dot: 'bg-rose-500', text: 'text-rose-600' },
  Cancelled: { dot: 'bg-amber-500', text: 'text-amber-600' },
};

type BatchStatusBadgeProps = {
  status: BatchStatus;
};

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
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
