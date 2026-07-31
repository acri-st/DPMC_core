import { useNavigate } from '@tanstack/react-router';
import type { HostContainerRuntime, HostStatus } from '@dpmc/client';
import { AlertCircleIcon, RefreshCwIcon, ServerIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FacetedFilter } from '@/shared/components/faceted-filter';
import { ListHeader } from '@/shared/components/list-header';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { useListParams } from '@/shared/hooks/use-list-params';
import { PagePagination } from '@/shared/components/page-pagination';
import { HostCard } from '@/features/host/components/host-card';
import { buildHostColumns } from '@/features/host/components/host-columns';
import { useHostList } from '@/features/host/hooks/use-host-list';

const DEFAULT_PAGE_SIZE = 50;

const HOST_STATUS_OPTIONS = (
  ['Up', 'Busy', 'Off', 'Maintenance'] as HostStatus[]
).map((s) => ({ value: s, label: s }));

const HOST_RUNTIME_OPTIONS = (
  ['Docker', 'Apptainer', 'Kubernetes', 'None'] as HostContainerRuntime[]
).map((r) => ({ value: r, label: r }));

export function HostListPage() {
  const lp = useListParams({
    filterKeys: ['status', 'containerRuntime'],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const [viewMode, setViewMode] = useViewMode('hosts', 'list');
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useHostList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    status: lp.filters.status as HostStatus[],
    containerRuntime: lp.filters.containerRuntime as HostContainerRuntime[],
    sort: lp.sort,
    order: lp.order,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const goToHost = (id: number) =>
    navigate({ to: '/hosts/$id', params: { id: String(id) } });

  const columns = buildHostColumns({ onView: goToHost });

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={ServerIcon}
        title="Hosts"
        subtitle="Worker hosts registered across data centers."
        count={data ? total : undefined}
        noun="host"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by hostname or IP address…',
        }}
        filters={
          <>
            <FacetedFilter
              label="Status"
              options={HOST_STATUS_OPTIONS}
              selected={lp.filters.status}
              onChange={(v) => lp.setFilter('status', v)}
            />
            <FacetedFilter
              label="Runtime"
              options={HOST_RUNTIME_OPTIONS}
              selected={lp.filters.containerRuntime}
              onChange={(v) => lp.setFilter('containerRuntime', v)}
            />
          </>
        }
        actions={
          <>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCwIcon
                className={isFetching ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
          </>
        }
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load hosts'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((host) => (
            <HostCard
              key={host.id}
              host={host}
              onSelect={() => goToHost(host.id)}
            />
          ))}
        </div>
      ) : null}

      {data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          onRowClick={(row) => goToHost(row.id)}
          emptyMessage="No hosts found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="host"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
