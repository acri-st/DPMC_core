import { useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircleIcon, CalendarClockIcon, PlusIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { useScheduleList } from '@/features/schedule/hooks/use-schedule-list';
import {
  useDeleteSchedule,
  useUpdateSchedule,
} from '@/features/schedule/hooks/use-schedule-mutations';
import {
  listProcessorVersionsLookup,
  listProductionChainsLookup,
} from '@/features/task/services/lookup.service';
import { buildScheduleColumns } from '@/features/schedule/components/schedule-columns';

export function ScheduleListPage() {
  const navigate = useNavigate();
  const list = useScheduleList();
  const update = useUpdateSchedule();
  const del = useDeleteSchedule();

  const chains = useQuery({
    queryKey: ['lookup', 'production-chains'],
    queryFn: listProductionChainsLookup,
  });
  const processors = useQuery({
    queryKey: ['lookup', 'processor-versions'],
    queryFn: listProcessorVersionsLookup,
  });

  const chainNames = useMemo(
    () => new Map((chains.data ?? []).map((c) => [c.id, c.name])),
    [chains.data],
  );
  const processorNames = useMemo(
    () => new Map((processors.data ?? []).map((p) => [p.id, p.baseline])),
    [processors.data],
  );

  const columns = useMemo(
    () =>
      buildScheduleColumns({
        chainNames,
        processorNames,
        onToggle: (id, enabled) => update.mutate({ id, body: { enabled } }),
        onEdit: (id) =>
          navigate({ to: '/schedules/$id', params: { id: String(id) } }),
        onDelete: (id) => del.mutate(id),
      }),
    [chainNames, processorNames, update, del, navigate],
  );

  const items = list.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={CalendarClockIcon}
        title="Schedules"
        subtitle="Recurring tasks created automatically from a cron expression."
        count={list.data ? items.length : undefined}
        noun="schedule"
      >
        <Button size="sm" asChild>
          <Link to="/tasks/new">
            <PlusIcon />
            New schedule
          </Link>
        </Button>
      </PageHeader>

      {list.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{list.error?.message ?? 'Failed to load schedules'}</span>
        </div>
      ) : null}

      {list.isLoading ? <Skeleton className="h-80 w-full rounded-md" /> : null}

      {list.data ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: '/schedules/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No schedules yet."
        />
      ) : null}
    </div>
  );
}
