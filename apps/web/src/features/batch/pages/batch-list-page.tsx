import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, LayersIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { PageHeader } from '@/shared/components/page-header';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { PagePagination } from '@/shared/components/page-pagination';
import { BatchCard } from '@/features/batch/components/batch-card';
import { buildBatchColumns } from '@/features/batch/components/batch-columns';
import { useBatchList } from '@/features/batch/hooks/use-batch-list';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useProductionChainList } from '@/features/production-chain/hooks/use-production-chain-list';

const DEFAULT_PAGE_SIZE = 25;

export function BatchListPage() {
  const [viewMode, setViewMode] = useViewMode('batches', 'table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const batchesQuery = useBatchList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
  });
  const { data: chainsResult } = useProductionChainList();

  const chainNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of chainsResult?.items ?? []) {
      map[c.id] = c.name;
    }
    return map;
  }, [chainsResult]);

  const columns = useMemo(
    () => buildBatchColumns({ chainNameById }),
    [chainNameById],
  );

  const items = batchesQuery.data?.items ?? [];
  const total = batchesQuery.data?.total ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={LayersIcon}
        title="Batches"
        subtitle="Runs of a production chain or standalone scripts."
        count={batchesQuery.data ? total : undefined}
        noun="batch"
        nounPlural="batches"
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => batchesQuery.refetch()}
          disabled={batchesQuery.isFetching}
        >
          <RefreshCwIcon
            className={batchesQuery.isFetching ? 'animate-spin' : undefined}
          />
          Refresh
        </Button>
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by execution tag…',
        }}
      />

      {batchesQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{batchesQuery.error?.message ?? 'Failed to load batches'}</span>
        </div>
      ) : null}

      {batchesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {batchesQuery.data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((batch) => (
            <BatchCard key={batch.id} batch={batch} chainName={null} />
          ))}
          {items.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-sm">
              No batches found.
            </p>
          ) : null}
        </div>
      ) : null}

      {batchesQuery.data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: '/batches/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No batches found."
        />
      ) : null}

      {batchesQuery.data ? (
        <PagePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          noun="batch"
          nounPlural="batches"
          isFetching={batchesQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
