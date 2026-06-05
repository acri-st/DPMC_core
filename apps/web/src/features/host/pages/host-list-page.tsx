import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, RefreshCwIcon, ServerIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { HostCard } from '@/features/host/components/host-card';
import { buildHostColumns } from '@/features/host/components/host-columns';
import { useHostList } from '@/features/host/hooks/use-host-list';

const DEFAULT_PAGE_SIZE = 50;

export function HostListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode] = useViewMode('hosts', 'list');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useHostList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const goToHost = (id: number) =>
    navigate({ to: '/hosts/$id', params: { id: String(id) } });

  const columns = buildHostColumns({ onView: goToHost });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={ServerIcon}
        title="Hosts"
        subtitle="Worker hosts registered across data centers."
        count={data ? total : undefined}
        noun="host"
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
          Refresh
        </Button>
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by hostname or IP address…',
        }}
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
          onRowClick={(row) => goToHost(row.id)}
          emptyMessage="No hosts found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          noun="host"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
