import type { ReactNode } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClipboardListIcon,
  LayersIcon,
  Loader2Icon,
  PlayIcon,
  ServerIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { TaskStatusBadge } from '@/features/task/components/task-status-badge';
import { TaskKindBadge } from '@/features/task/components/task-kind-badge';
import { useTask } from '@/features/task/hooks/use-task';
import { useTaskBatches } from '@/features/task/hooks/use-task-batches';
import {
  deleteTask,
  triggerTask,
  type TaskBatch,
} from '@/features/task/services/task.service';

export function TaskDetailPage() {
  const { id: idParam } = useParams({ from: '/tasks/$id' });
  const id = Number(idParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useTask(id);
  const batches = useTaskBatches(id);

  const trigger = useMutation({
    mutationFn: () => triggerTask(id),
    onSuccess: () => {
      toast.success('Task triggered');
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteTask(id),
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['task'] });
      void navigate({ to: '/tasks' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading task…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load task'}</span>
      </div>
    );
  }

  const params = data.parameters
    ? JSON.stringify(data.parameters, null, 2)
    : null;
  const temporal = data.temporalContext
    ? JSON.stringify(data.temporalContext, null, 2)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tasks">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <ClipboardListIcon className="size-4" />
            <span className="truncate font-mono">{data.executionTag}</span>
          </h1>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            Task{' '}
            <span className="font-mono">{String(data.id).slice(0, 12)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskKindBadge kind={data.kind} />
          <TaskStatusBadge status={data.status} />
          <Button
            size="sm"
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending}
          >
            {trigger.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PlayIcon />
            )}
            Trigger
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            {remove.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Linked batches
                  {batches.data ? (
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      ({batches.data.length})
                    </span>
                  ) : null}
                </CardTitle>
                {batches.isFetching && !batches.isLoading ? (
                  <Loader2Icon className="text-muted-foreground size-3 animate-spin" />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <BatchesSection
                isLoading={batches.isLoading}
                isError={batches.isError}
                error={batches.error}
                batches={batches.data}
              />
            </CardContent>
          </Card>

          {data.comment ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comment</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6">
                {data.comment}
              </CardContent>
            </Card>
          ) : null}

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

          {temporal ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Temporal context</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/40 max-h-60 overflow-auto rounded-md p-3 font-mono text-xs">
                  {temporal}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Project">
              <span className="font-mono text-xs">
                {String(data.projectId).slice(0, 12)}
              </span>
            </Field>
            <Separator />
            <Field label="Production chain">
              {data.productionChainId ? (
                <Link
                  to="/production-chain/$id"
                  params={{ id: String(data.productionChainId) }}
                  className="hover:text-primary font-mono text-xs"
                >
                  {String(data.productionChainId).slice(0, 12)}
                </Link>
              ) : (
                '—'
              )}
            </Field>
            <Separator />
            <Field label="Processor version">
              {data.processorVersionId ? (
                <span className="font-mono text-xs">
                  {String(data.processorVersionId).slice(0, 12)}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Separator />
            <Field label="Product">
              {data.productId ? (
                <span className="font-mono text-xs">
                  {String(data.productId).slice(0, 12)}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Separator />
            <Field
              icon={<CalendarIcon className="size-3.5" />}
              label="Scheduled"
            >
              {format(new Date(data.scheduledStartTime), 'PPpp')}
              <span className="text-muted-foreground ml-1 block">
                {formatDistanceToNow(new Date(data.scheduledStartTime), {
                  addSuffix: true,
                })}
              </span>
            </Field>
            <Separator />
            <Field label="Expected">
              {data.expectedStartTime
                ? format(new Date(data.expectedStartTime), 'PPpp')
                : '—'}
            </Field>
            <Separator />
            <Field label="Priority">
              <Badge variant="outline" className="font-mono">
                {data.priority}
              </Badge>
            </Field>
            <Separator />
            <Field label="Created">
              {format(new Date(data.createdAt), 'PPpp')}
            </Field>
            <Separator />
            <Field label="Updated">
              {format(new Date(data.updatedAt), 'PPpp')}
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

function BatchesSection({
  isLoading,
  isError,
  error,
  batches,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  batches: TaskBatch[] | undefined;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading batches…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-destructive flex items-start gap-2 p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load batches'}</span>
      </div>
    );
  }
  if (!batches || batches.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        No batches yet. The dispatcher will expand this task into batches once
        it picks it up.
      </div>
    );
  }
  return (
    <ul className="flex flex-col divide-y">
      {batches.map((b) => {
        const primary = b.scripts[0];
        const extra = b.scripts.length - 1;
        return (
          <li key={b.id}>
            <Link
              to="/batches/$id"
              params={{ id: String(b.id) }}
              className="hover:bg-muted/50 flex items-center gap-3 px-1 py-2.5"
            >
              <LayersIcon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {primary ? (
                    <>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px]"
                      >
                        {primary.acronym}
                      </Badge>
                      <span className="truncate text-sm font-medium">
                        {primary.name}
                      </span>
                      {extra > 0 ? (
                        <span className="text-muted-foreground text-[10px]">
                          +{extra}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="truncate font-mono text-xs">
                      {String(b.id).slice(0, 12)}
                    </span>
                  )}
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {b.kind}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-mono">{String(b.id).slice(0, 8)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {b.startedAt
                      ? `Started ${formatDistanceToNow(new Date(b.startedAt), { addSuffix: true })}`
                      : b.scheduledAt
                        ? `Scheduled ${formatDistanceToNow(new Date(b.scheduledAt), { addSuffix: true })}`
                        : `Created ${formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}`}
                  </span>
                  {b.hosts.length > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <ServerIcon className="size-3" />
                        {b.hosts.map((h) => h.hostname).join(', ')}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <BatchStatusBadge status={b.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
