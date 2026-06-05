import type { HostStatus } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

const STYLES: Record<HostStatus, { dot: string; text: string }> = {
  Up: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Busy: { dot: 'bg-amber-500', text: 'text-amber-600' },
  Off: { dot: 'bg-zinc-400', text: 'text-zinc-500' },
  Maintenance: { dot: 'bg-sky-500', text: 'text-sky-600' },
};

type HostStatusBadgeProps = {
  status: HostStatus;
};

export function HostStatusBadge({ status }: HostStatusBadgeProps) {
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
