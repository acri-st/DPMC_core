import { useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  ListChecksIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FacetedFilter } from '@/shared/components/faceted-filter';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useTaskList } from '@/features/task/hooks/use-task-list';
import { buildTaskColumns } from '@/features/task/components/task-columns';
import { deleteTask, triggerTask } from '@/features/task/services/task.service';
import type { TaskKind, TaskStatus } from '@dpmc/client';

const STATUSES: TaskStatus[] = [
  'Edited',
  'Queued',
  'Running',
  'Done',
  'Error',
  'Suspended',
];

const TASK_STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

const TASK_KIND_OPTIONS = (['Chain', 'Standalone'] as TaskKind[]).map((k) => ({
  value: k,
  label: k,
}));

const DEFAULT_PAGE_SIZE = 25;

export function TaskListPage() {
  const lp = useListParams({
    filterKeys: ['status', 'kind'],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tasksQuery = useTaskList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    status: lp.filters.status as TaskStatus[],
    kind: lp.filters.kind as TaskKind[],
    sort: lp.sort,
    order: lp.order,
  });

  const trigger = useMutation({
    mutationFn: (id: number) => triggerTask(id),
    onSuccess: () => {
      toast.success('Task triggered');
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = useMemo(
    () =>
      buildTaskColumns({
        onView: (id) =>
          navigate({ to: '/tasks/$id', params: { id: String(id) } }),
        onTrigger: (id) => trigger.mutate(id),
        onDelete: (id) => remove.mutate(id),
        isMutating: trigger.isPending || remove.isPending,
      }),
    [navigate, trigger, remove],
  );

  const items = tasksQuery.data?.items ?? [];
  const total = tasksQuery.data?.total ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={ListChecksIcon}
        title="Tasks"
        subtitle="Scheduled, high-level work items. Each task spawns one or more batches when triggered."
        count={tasksQuery.data ? total : undefined}
        noun="task"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by execution tag, id, comment…',
        }}
        filters={
          <>
            <FacetedFilter
              label="Status"
              options={TASK_STATUS_OPTIONS}
              selected={lp.filters.status}
              onChange={(v) => lp.setFilter('status', v)}
            />
            <FacetedFilter
              label="Kind"
              options={TASK_KIND_OPTIONS}
              selected={lp.filters.kind}
              onChange={(v) => lp.setFilter('kind', v)}
            />
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tasksQuery.refetch()}
              disabled={tasksQuery.isFetching}
            >
              <RefreshCwIcon
                className={tasksQuery.isFetching ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link to="/tasks/new">
                <PlusIcon />
                New task
              </Link>
            </Button>
          </>
        }
      />

      {tasksQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{tasksQuery.error?.message ?? 'Failed to load tasks'}</span>
        </div>
      ) : null}

      {tasksQuery.isLoading ? (
        <Skeleton className="h-80 w-full rounded-md" />
      ) : null}

      {tasksQuery.data ? (
        <DataTable
          data={items}
          columns={columns}
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          onRowClick={(row) =>
            navigate({ to: '/tasks/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No tasks found."
        />
      ) : null}

      {tasksQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="task"
          isFetching={tasksQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
