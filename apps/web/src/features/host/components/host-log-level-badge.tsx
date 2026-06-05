import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';
import type { HostLogEntry } from '@/features/host/services/host-logs.service';

const LEVEL_TONE: Record<HostLogEntry['level'], string> = {
  Debug: 'border-zinc-400/40 bg-zinc-500/10 text-zinc-600',
  Info: 'border-blue-500/40 bg-blue-500/10 text-blue-600',
  Warning: 'border-amber-500/40 bg-amber-500/15 text-amber-700',
  Error: 'border-rose-500/40 bg-rose-500/15 text-rose-700',
  Critical: 'border-red-700/60 bg-red-700/85 text-white',
};

type Props = {
  level: HostLogEntry['level'];
  className?: string;
};

export function HostLogLevelBadge({ level, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 px-1.5 py-0 font-mono text-[10px] uppercase tracking-wide',
        LEVEL_TONE[level],
        className,
      )}
    >
      {level}
    </Badge>
  );
}
