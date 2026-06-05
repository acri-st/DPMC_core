import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { toast } from 'sonner';

import { PoolCard } from '@/features/pool/components/pool-card';
import { buildPoolColumns } from '@/features/pool/components/pool-columns';
import { CreatePoolDialog } from '@/features/pool/components/create-pool-dialog';
import { usePoolList } from '@/features/pool/hooks/use-pool-list';
import { useDeletePool } from '@/features/pool/hooks/use-delete-pool';

const DEFAULT_PAGE_SIZE = 50;

export function PoolListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('pools', 'list');

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } = usePoolList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const deletePool = useDeletePool();
  const columns = buildPoolColumns({
    onView: (id) => navigate({ to: '/pools/$id', params: { id: String(id) } }),
    isDeleting: deletePool.isPending,
    onDelete: (id) =>
      deletePool.mutate(id, {
        onSuccess: () => toast.success('Pool deleted'),
        onError: (e: Error) => toast.error(e.message),
      }),
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={ServerIcon}
        title="Pools"
        subtitle="Logical groupings of hosts for scheduling."
        count={data ? total : undefined}
        noun="pool"
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
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          New pool
        </Button>
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by name…',
        }}
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load pools'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      ) : null}

      {data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.length === 0 ? (
            <div className="text-muted-foreground rounded-md border p-6 text-center text-sm sm:col-span-2 xl:col-span-3">
              No pools found.
            </div>
          ) : (
            items.map((pool) => <PoolCard key={pool.id} pool={pool} />)
          )}
        </div>
      ) : null}

      {data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: '/pools/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No pools found."
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
          noun="pool"
          nounPlural="pools"
          isFetching={isFetching}
        />
      ) : null}

      <CreatePoolDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
