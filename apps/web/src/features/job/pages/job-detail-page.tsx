import type { ReactNode } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ClockIcon,
  Loader2Icon,
  ScrollTextIcon,
  ServerIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { JobStatusBadge } from '@/features/job/components/job-status-badge';
import { getJob } from '@/features/job/services/job.service';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';

export function JobDetailPage() {
  const { id } = useParams({ from: '/jobs/$id' });
  const { status } = useCurrentUser();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(Number(id)),
    enabled: status === 'authenticated' && !Number.isNaN(Number(id)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading job…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load job'}</span>
      </div>
    );
  }

  const dur = durationBetween(data.startedAt, data.endedAt);
  const params = data.parameters
    ? JSON.stringify(data.parameters, null, 2)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/jobs">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <ScrollTextIcon className="size-4" />
            <span className="truncate font-mono">{data.executionTag}</span>
          </h1>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            Job{' '}
            <span className="font-mono">{String(data.id).slice(0, 12)}</span>
          </p>
        </div>
        <JobStatusBadge status={data.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Batch">
                <Link
                  to="/batches/$id"
                  params={{ id: String(data.batchId) }}
                  className="hover:text-primary font-mono text-xs"
                >
                  {String(data.batchId).slice(0, 12)}
                </Link>
              </Field>
              <Separator />
              <Field label="Script version">
                <span className="font-mono text-xs">
                  {String(data.processingScriptVersionId).slice(0, 12)}
                </span>
              </Field>
              <Separator />
              <Field icon={<ServerIcon className="size-3.5" />} label="Host">
                <span className="font-mono text-xs">
                  {data.hostId ? String(data.hostId).slice(0, 12) : '—'}
                </span>
              </Field>
              <Separator />
              <Field label="PID">
                <span className="font-mono text-xs">{data.pid ?? '—'}</span>
              </Field>
              <Separator />
              <Field label="Output dir">
                <span className="break-all font-mono text-xs">
                  {data.outputDir ?? '—'}
                </span>
              </Field>
            </CardContent>
          </Card>

          {params ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs">
                  {params}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field icon={<ClockIcon className="size-3.5" />} label="Expected">
              {data.expectedStartTime
                ? formatDistanceToNow(new Date(data.expectedStartTime), {
                    addSuffix: true,
                  })
                : '—'}
            </Field>
            <Separator />
            <Field label="Started">
              {data.startedAt ? format(new Date(data.startedAt), 'PPpp') : '—'}
            </Field>
            <Separator />
            <Field label="Ended">
              {data.endedAt ? format(new Date(data.endedAt), 'PPpp') : '—'}
            </Field>
            <Separator />
            <Field label="Duration">
              <span className="font-mono">{formatDurationMs(dur)}</span>
            </Field>
            <Separator />
            <Field label="Avg power">
              {data.avgPower !== null && data.avgPower !== undefined
                ? `${data.avgPower.toFixed(1)} W`
                : '—'}
            </Field>
            <Separator />
            <Field label="Data volume">
              {data.dataVolume !== null && data.dataVolume !== undefined ? (
                <Badge variant="outline" className="font-mono">
                  {data.dataVolume.toLocaleString()} B
                </Badge>
              ) : (
                '—'
              )}
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-right text-xs">{children}</span>
    </div>
  );
}
