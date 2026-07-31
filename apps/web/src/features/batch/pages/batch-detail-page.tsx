import { Link, useParams } from '@tanstack/react-router';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ClockIcon,
  HashIcon,
  LayersIcon,
  Loader2Icon,
  ServerIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { BatchStatusBadge } from '@/features/batch/components/batch-status-badge';
import { formatCo2 } from '@/features/batch/libs/format-co2';
import { Co2Breakdown } from '@/shared/components/co2-breakdown';
import {
  useBatch,
  useBatchInputs,
  useBatchJobs,
  useBatchLogs,
} from '@/features/batch/hooks/use-batch';
import { useDatasetList } from '@/features/dataset/hooks/use-dataset-list';
import type {
  BatchJobView,
  BatchLogEntry,
} from '@/features/batch/services/batch.service';

export function BatchDetailPage() {
  const { id: idParam } = useParams({ from: '/batches/$id' });
  const id = Number(idParam);
  const batch = useBatch(id);
  const jobs = useBatchJobs(id);
  const inputs = useBatchInputs(id);
  const logs = useBatchLogs(id);
  const outputDatasets = useDatasetList({ producedByBatchId: id });
  const outDataset = outputDatasets.data?.items?.[0];

  if (batch.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading batch…
        </div>
      </div>
    );
  }

  if (batch.isError || !batch.data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{batch.error?.message ?? 'Failed to load batch'}</span>
      </div>
    );
  }

  const b = batch.data;
  const duration = formatDuration(b.startedAt, b.endedAt);

  // Inputs are resolved server-side from the BatchDatasetIn graph (each
  // DatasetProduct exposing its role, name and type). The actual bytes are
  // retrieved by the processing script itself from the product's media graph,
  // so the UI only lists input metadata — no thumbnail preview.
  const inputEntries = inputs.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/batches">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <LayersIcon className="size-4" />
            <span className="truncate font-mono">{b.id}</span>
          </h1>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            Task{' '}
            <Link
              to="/tasks/$id"
              params={{ id: String(b.taskId) }}
              className="hover:text-primary font-mono"
            >
              {String(b.taskId).slice(0, 12)}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{b.kind}</Badge>
          <BatchStatusBadge status={b.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Jobs
                  {jobs.data ? (
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      ({jobs.data.length})
                    </span>
                  ) : null}
                </CardTitle>
                {jobs.isFetching && !jobs.isLoading ? (
                  <Loader2Icon className="text-muted-foreground size-3 animate-spin" />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <JobsSection
                isLoading={jobs.isLoading}
                isError={jobs.isError}
                error={jobs.error}
                jobs={jobs.data}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Logs
                  {logs.data ? (
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      ({logs.data.logs.length})
                    </span>
                  ) : null}
                </CardTitle>
                {logs.isFetching && !logs.isLoading ? (
                  <Loader2Icon className="text-muted-foreground size-3 animate-spin" />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <LogsSection
                isLoading={logs.isLoading}
                isError={logs.isError}
                error={logs.error}
                logs={logs.data?.logs}
              />
            </CardContent>
          </Card>

          {inputEntries.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Inputs
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    ({inputEntries.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y">
                  {inputEntries.map((entry) => (
                    <li
                      key={entry.productId}
                      className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 py-2 text-xs"
                    >
                      <RoleBadge role={entry.role} tone="info" />
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-mono">
                          {entry.productName}
                        </p>
                        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[10px]">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono"
                          >
                            {entry.productType}
                          </Badge>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Output Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              {outputDatasets.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Loading…
                </div>
              ) : outDataset ? (
                <Link
                  to="/datasets/$datasetId"
                  params={{ datasetId: String(outDataset.id) }}
                  className="hover:text-primary inline-flex items-center gap-1 text-xs"
                >
                  <Badge variant="outline" className="font-mono">
                    {outDataset.name ?? String(outDataset.id).slice(0, 8)}
                  </Badge>
                </Link>
              ) : (
                <span className="text-muted-foreground text-xs">
                  No output dataset yet — the batch hasn't produced anything.
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Execution tag">
              <span className="font-mono text-xs">
                {b.executionTag.slice(0, 12)}
              </span>
            </Field>
            <Separator />
            <Field label="Priority">
              <Badge variant="outline" className="font-mono">
                {b.priority}
              </Badge>
            </Field>
            <Separator />
            <Field label="Production mode">{b.productionMode}</Field>
            <Separator />
            <Field label="Priority class">{b.priorityClass}</Field>
            <Separator />
            <Field label="Started">
              {b.startedAt ? (
                <>
                  {format(new Date(b.startedAt), 'PPpp')}
                  <span className="text-muted-foreground ml-1 block">
                    {formatDistanceToNow(new Date(b.startedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </>
              ) : (
                '—'
              )}
            </Field>
            <Separator />
            <Field label="Ended">
              {b.endedAt ? format(new Date(b.endedAt), 'PPpp') : '—'}
            </Field>
            <Separator />
            <Field label="Duration">{duration ?? '—'}</Field>
            <Separator />
            <div className="space-y-2">
              <Field label="CO₂">
                {typeof b.co2Grams === 'number' ? formatCo2(b.co2Grams) : '—'}
              </Field>
              {b.co2GramsByConcern ? (
                <Co2Breakdown
                  concerns={b.co2GramsByConcern}
                  energyWh={b.energyWhByConcern}
                  transferSource={b.transferSource}
                  transferSourceMixed={b.transferSourceMixed}
                />
              ) : null}
            </div>
            <Separator />
            <Field label="Created">
              {format(new Date(b.createdAt), 'PPpp')}
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        {label}
      </span>
      <span className="text-right text-xs">{children}</span>
    </div>
  );
}

function JobsSection({
  isLoading,
  isError,
  error,
  jobs,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  jobs: BatchJobView[] | undefined;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading jobs…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-destructive flex items-start gap-2 p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load jobs'}</span>
      </div>
    );
  }
  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        No jobs yet.
      </div>
    );
  }
  return (
    <ul className="flex flex-col divide-y">
      {jobs.map((j) => (
        <li key={j.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {j.acronym}
            </Badge>
            <span className="text-sm font-medium">{j.scriptName}</span>
            <Badge variant="secondary" className="ml-auto">
              {j.status}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <HashIcon className="size-3" />
              <span className="font-mono">{String(j.id).slice(0, 12)}</span>
            </span>
            {j.hostId ? (
              <Link
                to="/hosts/$id"
                params={{ id: String(j.hostId) }}
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <ServerIcon className="size-3" />
                <span>{j.hostname ?? String(j.hostId).slice(0, 12)}</span>
              </Link>
            ) : null}
            {j.attempt > 0 ? <span>attempt #{j.attempt}</span> : null}
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" />
              {formatDuration(j.startedAt, j.endedAt) ?? '—'}
            </span>
            {typeof j.exitCode === 'number' ? (
              <span>exit {j.exitCode}</span>
            ) : null}
          </div>
          {j.lastError ? (
            <pre className="bg-destructive/10 text-destructive mt-2 max-h-40 overflow-auto rounded-md p-2 font-mono text-[11px] leading-snug">
              {j.lastError}
            </pre>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function LogsSection({
  isLoading,
  isError,
  error,
  logs,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  logs: BatchLogEntry[] | undefined;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading logs…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-destructive flex items-start gap-2 p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load logs'}</span>
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        No logs yet. They'll appear here as the IPF runs.
      </div>
    );
  }
  // The API returns DESC for fast tail loads; flip to chronological for the
  // reader. We slice to avoid mutating the cached array.
  const ordered = [...logs].reverse();
  return (
    <div className="bg-muted/40 max-h-[420px] overflow-auto rounded-md border font-mono text-[11px] leading-relaxed">
      <ul className="flex flex-col">
        {ordered.map((l) => (
          <li
            key={l.id}
            className="hover:bg-muted/60 grid grid-cols-[auto_auto_1fr] gap-2 border-b px-2 py-1 last:border-b-0"
          >
            <span className="text-muted-foreground tabular-nums">
              {new Date(l.loggedAt).toISOString().slice(11, 23)}
            </span>
            <LogLevelBadge level={l.level} />
            <span className="whitespace-pre-wrap break-words">{l.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogLevelBadge({ level }: { level: BatchLogEntry['level'] }) {
  const tone =
    level === 'Critical' || level === 'Error'
      ? 'text-destructive'
      : level === 'Warning'
        ? 'text-amber-600 dark:text-amber-500'
        : level === 'Debug'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <span className={`${tone} w-12 shrink-0 uppercase`}>
      {level.slice(0, 4)}
    </span>
  );
}

function RoleBadge({ role }: { role: string; tone?: 'info' }) {
  return (
    <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-700 dark:text-sky-400">
      {role}
    </span>
  );
}

function formatDuration(
  start: string | null,
  end: string | null,
): string | null {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, endMs - startMs);
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}
