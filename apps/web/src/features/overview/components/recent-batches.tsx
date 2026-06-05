import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRightIcon } from 'lucide-react';

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
import type { Batch } from '@/features/batch/types';

type RecentBatchesProps = {
  batches: Batch[];
  chainNameById: Record<string, string>;
  isLoading: boolean;
};

export function RecentBatches({
  batches,
  chainNameById: _chainNameById,
  isLoading,
}: RecentBatchesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">Recent batches</CardTitle>
        <Link
          to="/batches"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <RecentSkeleton />
        ) : batches.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No batches yet.
          </p>
        ) : (
          batches.map((b) => {
            const dur = durationBetween(b.startedAt, b.endedAt);
            const chainName: string | null = null;
            return (
              <Link
                key={b.id}
                to="/batches/$id"
                params={{ id: String(b.id) }}
                className="hover:bg-muted/40 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {chainName ?? String(b.id).slice(0, 8)}
                </span>
                <span className="flex items-center gap-3 text-xs">
                  <BatchStatusBadge status={b.status} />
                  <span className="text-muted-foreground hidden md:inline">
                    {b.startedAt
                      ? formatDistanceToNow(new Date(b.startedAt), {
                          addSuffix: true,
                        })
                      : '—'}
                  </span>
                  <span className="font-mono">{formatDurationMs(dur)}</span>
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function RecentSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full rounded-md" />
      ))}
    </>
  );
}
