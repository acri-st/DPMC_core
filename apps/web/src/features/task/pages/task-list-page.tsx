import { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { PageHeader } from '@/shared/components/page-header';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { PagePagination } from '@/shared/components/page-pagination';
import { useTaskList } from '@/features/task/hooks/use-task-list';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { buildTaskColumns } from '@/features/task/components/task-columns';
import { deleteTask, triggerTask } from '@/features/task/services/task.service';
import type { TaskStatus } from '@dpmc/client';

const STATUSES: TaskStatus[] = [
  'Edited',
  'Queued',
  'Running',
  'Done',
  'Error',
  'Suspended',
];

const DEFAULT_PAGE_SIZE = 25;

export function TaskListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ, statusFilter]);

  const tasksQuery = useTaskList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
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
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={ListChecksIcon}
        title="Tasks"
        subtitle="Scheduled, high-level work items. Each task spawns one or more batches when triggered."
        count={tasksQuery.data ? total : undefined}
        noun="task"
      >
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
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by execution tag, id, comment…',
        }}
      >
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | TaskStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageToolbar>

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
          onRowClick={(row) =>
            navigate({ to: '/tasks/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No tasks found."
        />
      ) : null}

      {tasksQuery.data ? (
        <PagePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          noun="task"
          isFetching={tasksQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
