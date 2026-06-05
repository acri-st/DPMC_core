import { ScrollTextIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { JobStatusBadge } from '@/features/job/components/job-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import type { Job } from '@/features/job/types';

type JobCardProps = {
  job: Job;
  scriptLabel?: string | null;
  hostname?: string | null;
};

export function JobCard({ job, scriptLabel, hostname }: JobCardProps) {
  const dur = durationBetween(job.startedAt, job.endedAt);
  return (
    <Link
      to="/jobs/$id"
      params={{ id: String(job.id) }}
      className="focus-visible:ring-ring/50 block rounded-md focus-visible:outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm">
              <ScrollTextIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate">
                {scriptLabel ?? job.executionTag ?? String(job.id).slice(0, 8)}
              </span>
            </CardTitle>
            <JobStatusBadge status={job.status} />
          </div>
          <CardDescription className="text-muted-foreground text-xs">
            host:{' '}
            <span className="font-mono">
              {hostname ??
                (job.hostId != null ? String(job.hostId).slice(0, 8) : '—')}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid grid-cols-2 gap-1 text-xs">
          <span>Started</span>
          <span className="text-right">
            {job.startedAt
              ? formatDistanceToNow(new Date(job.startedAt), {
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
