import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { LayersIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { BatchStatusBadge } from '@/features/batch/components/batch-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import { useHostBatches } from '@/features/host/hooks/use-host-batches';

type Props = {
  hostId: number;
  limit?: number;
};

export function HostRecentBatches({ hostId, limit = 10 }: Props) {
  const { data, isLoading, isError } = useHostBatches(hostId, limit);
  const entries = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LayersIcon className="size-4" />
          Recent batches
        </CardTitle>
        <span className="text-muted-foreground text-[11px]">
          last {limit} that ran on this host
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            Failed to load batches.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground py-3 text-center text-xs">
            No batch has been executed on this host yet.
          </p>
        ) : (
          entries.map(
            ({ batch, jobsOnHost, lastJobEndedAt, lastJobStartedAt }) => {
              const startedAtIso = batch.startedAt
                ? batch.startedAt.toISOString()
                : null;
              const endedAtIso = batch.endedAt
                ? batch.endedAt.toISOString()
                : null;
              const dur = durationBetween(startedAtIso, endedAtIso);
              const lastWhen = lastJobEndedAt ?? lastJobStartedAt;
              return (
                <Link
                  key={batch.id}
                  to="/batches/$id"
                  params={{ id: String(batch.id) }}
                  className="hover:bg-muted/40 flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {batch.executionTag || String(batch.id).slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {batch.kind}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <BatchStatusBadge status={batch.status} />
                    <span
                      className="text-muted-foreground hidden md:inline"
                      title={
                        jobsOnHost === 1
                          ? '1 job ran on this host'
                          : `${jobsOnHost} jobs ran on this host`
                      }
                    >
                      {jobsOnHost} job{jobsOnHost === 1 ? '' : 's'}
                    </span>
                    <span className="text-muted-foreground hidden md:inline">
                      {lastWhen
                        ? formatDistanceToNow(new Date(lastWhen), {
                            addSuffix: true,
                          })
                        : '—'}
                    </span>
                    <span className="font-mono text-xs">
                      {formatDurationMs(dur)}
                    </span>
                  </div>
                </Link>
              );
            },
          )
        )}
      </CardContent>
    </Card>
  );
}
