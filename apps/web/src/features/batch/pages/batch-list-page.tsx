import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { BatchKind, BatchStatus } from '@dpmc/client';
import { AlertCircleIcon, LayersIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FacetedFilter } from '@/shared/components/faceted-filter';
import { ListHeader } from '@/shared/components/list-header';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { useListParams } from '@/shared/hooks/use-list-params';
import { PagePagination } from '@/shared/components/page-pagination';
import { BatchCard } from '@/features/batch/components/batch-card';
import { buildBatchColumns } from '@/features/batch/components/batch-columns';
import { useBatchList } from '@/features/batch/hooks/use-batch-list';
import { useProductionChainList } from '@/features/production-chain/hooks/use-production-chain-list';

const DEFAULT_PAGE_SIZE = 25;

const BATCH_STATUS_OPTIONS = (
  ['Pending', 'Running', 'Success', 'Failed', 'Cancelled'] as BatchStatus[]
).map((s) => ({ value: s, label: s }));

const BATCH_KIND_OPTIONS = (['Chain', 'Standalone'] as BatchKind[]).map(
  (k) => ({ value: k, label: k }),
);

export function BatchListPage() {
  const lp = useListParams({
    filterKeys: ['status', 'kind'],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const [viewMode, setViewMode] = useViewMode('batches', 'table');
  const navigate = useNavigate();

  const batchesQuery = useBatchList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    status: lp.filters.status as BatchStatus[],
    kind: lp.filters.kind as BatchKind[],
    sort: lp.sort,
    order: lp.order,
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
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={LayersIcon}
        title="Batches"
        subtitle="Runs of a production chain or standalone scripts."
        count={batchesQuery.data ? total : undefined}
        noun="batch"
        nounPlural="batches"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by execution tag…',
        }}
        filters={
          <>
            <FacetedFilter
              label="Status"
              options={BATCH_STATUS_OPTIONS}
              selected={lp.filters.status}
              onChange={(v) => lp.setFilter('status', v)}
            />
            <FacetedFilter
              label="Kind"
              options={BATCH_KIND_OPTIONS}
              selected={lp.filters.kind}
              onChange={(v) => lp.setFilter('kind', v)}
            />
          </>
        }
        actions={
          <>
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
          </>
        }
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
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          onRowClick={(row) =>
            navigate({ to: '/batches/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No batches found."
        />
      ) : null}

      {batchesQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="batch"
          nounPlural="batches"
          isFetching={batchesQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
