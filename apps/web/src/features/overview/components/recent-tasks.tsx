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
import { cn } from '@/shared/utils';
import type { Task } from '@/features/task/types';

type RecentTasksProps = {
  tasks: Task[];
  isLoading: boolean;
};

// Distinguish the three lifecycle phases the status badge alone doesn't convey:
// a past run (already started), a future scheduled run (Queued with a
// scheduledStartTime ahead), and an unscheduled draft (Edited).
function taskTiming(t: Task): { text: string; className: string } {
  if (t.startedAt) {
    return {
      text: `started ${formatDistanceToNow(new Date(t.startedAt), { addSuffix: true })}`,
      className: 'text-muted-foreground',
    };
  }
  if (t.status === 'Edited') {
    return {
      text: 'draft — not scheduled',
      className: 'text-muted-foreground',
    };
  }
  const scheduledMs = t.scheduledStartTime
    ? new Date(t.scheduledStartTime).getTime()
    : null;
  if (scheduledMs && scheduledMs > Date.now()) {
    return {
      text: `scheduled ${formatDistanceToNow(new Date(scheduledMs), { addSuffix: true })}`,
      className: 'text-amber-500',
    };
  }
  return { text: 'queued', className: 'text-muted-foreground' };
}

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
            const timing = taskTiming(t);
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
                  <span className={cn('hidden sm:inline', timing.className)}>
                    {timing.text}
                  </span>
                  <span className="font-mono">
                    {t.startedAt ? formatDurationMs(dur) : '—'}
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

function RecentSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full rounded-md" />
      ))}
    </>
  );
}
