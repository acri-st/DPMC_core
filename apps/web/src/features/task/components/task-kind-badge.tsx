import type { TaskKind } from '@dpmc/client';
import { LinkIcon, BoxIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

type TaskKindBadgeProps = {
  kind: TaskKind;
};

export function TaskKindBadge({ kind }: TaskKindBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5',
        kind === 'Chain'
          ? 'border-indigo-500/40 text-indigo-600'
          : 'border-orange-500/40 text-orange-600',
      )}
    >
      {kind === 'Chain' ? (
        <LinkIcon className="size-3" />
      ) : (
        <BoxIcon className="size-3" />
      )}
      {kind}
    </Badge>
  );
}
