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
import { TaskStatusBadge } from '@/features/task/components/task-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import type { Task } from '@/features/task/types';

type RecentTasksProps = {
  tasks: Task[];
  isLoading: boolean;
};

export function RecentTasks({ tasks, isLoading }: RecentTasksProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">Recent tasks</CardTitle>
        <Link
          to="/tasks"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <RecentSkeleton />
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No tasks yet.
          </p>
        ) : (
          tasks.map((t) => {
            const dur = durationBetween(t.startedAt, t.completedAt);
            return (
              <Link
                key={t.id}
                to="/tasks/$id"
                params={{ id: String(t.id) }}
                className="hover:bg-muted/40 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="min-w-0 truncate font-mono text-xs">
                  {String(t.id).slice(0, 8)}
                </span>
                <span className="flex items-center gap-3 text-xs">
                  <TaskStatusBadge status={t.status} />
                  <span className="text-muted-foreground hidden font-mono md:inline">
                    {t.kind}
                  </span>
                  <span className="text-muted-foreground hidden lg:inline">
                    {t.startedAt
                      ? formatDistanceToNow(new Date(t.startedAt), {
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
