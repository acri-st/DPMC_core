import { LayersIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { BatchStatusBadge } from '@/features/batch/components/batch-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import type { Batch } from '@/features/batch/types';

type BatchCardProps = {
  batch: Batch;
  chainName?: string | null;
};

export function BatchCard({ batch, chainName }: BatchCardProps) {
  const dur = durationBetween(batch.startedAt, batch.endedAt);
  return (
    <Link
      to="/batches/$id"
      params={{ id: String(batch.id) }}
      className="focus-visible:ring-ring/50 block rounded-md focus-visible:outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm">
              <LayersIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate">
                {chainName ?? String(batch.id).slice(0, 8)}
              </span>
            </CardTitle>
            <BatchStatusBadge status={batch.status} />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline">{batch.kind}</Badge>
            <span className="text-muted-foreground">
              priority {batch.priority}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid grid-cols-2 gap-1 text-xs">
          <span>Started</span>
          <span className="text-right">
            {batch.startedAt
              ? formatDistanceToNow(new Date(batch.startedAt), {
                  addSuffix: true,
                })
              : '—'}
          </span>
          <span>Duration</span>
          <span className="text-right font-mono">{formatDurationMs(dur)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
