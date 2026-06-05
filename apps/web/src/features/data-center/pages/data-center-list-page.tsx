import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, BoxIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { DataCenterCard } from '@/features/data-center/components/data-center-card';
import { buildDataCenterColumns } from '@/features/data-center/components/data-center-columns';
import { DataCenterMap } from '@/features/data-center/components/data-center-map';
import { useDataCenterList } from '@/features/data-center/hooks/use-data-center-list';

const DEFAULT_PAGE_SIZE = 50;

export function DataCenterListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('data-centers', 'list');

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useDataCenterList({
      page,
      pageSize,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const columns = buildDataCenterColumns({
    onView: (id) =>
      navigate({ to: '/data-center/$id', params: { id: String(id) } }),
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={BoxIcon}
        title="Data centers"
        subtitle="Hosting sites and their environmental characteristics."
        count={data ? total : undefined}
        noun="center"
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
          placeholder: 'Search by name or code…',
        }}
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load data centers'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {data && items.length > 0 ? (
        <DataCenterMap dataCenters={items} className="h-64" />
      ) : null}

      {data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((dc) => (
            <DataCenterCard key={dc.id} dataCenter={dc} />
          ))}
        </div>
      ) : null}

      {data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: '/data-center/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No data centers found."
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
          noun="center"
          nounPlural="centers"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
