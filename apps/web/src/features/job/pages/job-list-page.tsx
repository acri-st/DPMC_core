import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, PlayCircleIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { useListParams } from '@/shared/hooks/use-list-params';
import { PagePagination } from '@/shared/components/page-pagination';
import { JobCard } from '@/features/job/components/job-card';
import { buildJobColumns } from '@/features/job/components/job-columns';
import { useJobList } from '@/features/job/hooks/use-job-list';
import { useHostList } from '@/features/host/hooks/use-host-list';

const DEFAULT_PAGE_SIZE = 25;

export function JobListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const [viewMode, setViewMode] = useViewMode('jobs', 'table');
  const navigate = useNavigate();

  const jobsQuery = useJobList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    sort: lp.sort,
    order: lp.order,
  });
  const { data: hostsResult } = useHostList({ page: 1, pageSize: 500 });

  const hostnameById = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const h of hostsResult?.items ?? []) {
      map[h.id] = h.hostname;
    }
    return map;
  }, [hostsResult]);

  // Script label lookup is empty for now — we don't fetch versions in this iteration.
  const scriptLabelByVersionId = useMemo<Record<number, string>>(
    () => ({}),
    [],
  );

  const columns = useMemo(
    () =>
      buildJobColumns({
        scriptLabelByVersionId,
        hostnameById,
        onView: (id) =>
          navigate({ to: '/jobs/$id', params: { id: String(id) } }),
      }),
    [scriptLabelByVersionId, hostnameById, navigate],
  );

  const items = jobsQuery.data?.items ?? [];
  const total = jobsQuery.data?.total ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={PlayCircleIcon}
        title="Jobs"
        subtitle="Individual script executions across all batches."
        count={jobsQuery.data ? total : undefined}
        noun="job"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by execution tag…',
        }}
        actions={
          <>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => jobsQuery.refetch()}
              disabled={jobsQuery.isFetching}
            >
              <RefreshCwIcon
                className={jobsQuery.isFetching ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
          </>
        }
      />

      {jobsQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{jobsQuery.error?.message ?? 'Failed to load jobs'}</span>
        </div>
      ) : null}

      {jobsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {jobsQuery.data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              hostname={job.hostId ? hostnameById[job.hostId] : null}
            />
          ))}
          {items.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-sm">
              No jobs found.
            </p>
          ) : null}
        </div>
      ) : null}

      {jobsQuery.data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          onRowClick={(row) =>
            navigate({ to: '/jobs/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No jobs found."
        />
      ) : null}

      {jobsQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="job"
          isFetching={jobsQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
