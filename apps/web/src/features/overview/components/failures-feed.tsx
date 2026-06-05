import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangleIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import type { Task } from '@/features/task/types';

type FailuresFeedProps = {
  failures: Task[];
  isLoading: boolean;
};

export function FailuresFeed({ failures, isLoading }: FailuresFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <AlertTriangleIcon className="size-4 text-rose-500" />
        <CardTitle className="text-sm">Recent failures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <FailuresSkeleton />
        ) : failures.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No failures recently. Nice.
          </p>
        ) : (
          failures.map((t) => {
            const failedAt = t.completedAt ?? t.updatedAt;
            return (
              <Link
                key={t.id}
                to="/tasks/$id"
                params={{ id: String(t.id) }}
                className="hover:bg-muted/40 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span className="font-mono text-xs">
                    {String(t.id).slice(0, 8)}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground font-mono">
                    {t.kind}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(failedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function FailuresSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full rounded-md" />
      ))}
    </>
  );
}
