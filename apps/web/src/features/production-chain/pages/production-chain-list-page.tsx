import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  WorkflowIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useProductionChainList } from '@/features/production-chain/hooks/use-production-chain-list';
import { CreateChainDialog } from '@/features/production-chain/components/create-chain-dialog';
import { buildProductionChainColumns } from '@/features/production-chain/components/production-chain-columns';

const DEFAULT_PAGE_SIZE = 50;

export function ProductionChainListPage() {
  const [viewMode, setViewMode] = useViewMode('production-chains', 'list');
  const navigate = useNavigate();
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProductionChainList({
      page: lp.page,
      pageSize: lp.pageSize,
      q: lp.trimmedQ || undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const goToChain = (id: number) =>
    navigate({ to: '/production-chain/$id', params: { id: String(id) } });

  const columns = useMemo(
    () =>
      buildProductionChainColumns({
        onView: (id) =>
          navigate({ to: '/production-chain/$id', params: { id: String(id) } }),
      }),
    [navigate],
  );

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={WorkflowIcon}
        title="Production chains"
        subtitle="Browse the configured pipelines and inspect their execution graph."
        count={data ? total : undefined}
        noun="chain"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name or comment…',
        }}
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
            <CreateChainDialog />
          </>
        }
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load production chains'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {!isLoading && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((chain) => (
            <Link
              key={chain.id}
              to="/production-chain/$id"
              params={{ id: String(chain.id) }}
              className="group focus-visible:ring-ring/50 rounded-md focus-visible:outline-none focus-visible:ring-2"
            >
              <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 truncate">
                        <WorkflowIcon className="text-muted-foreground size-4 shrink-0" />
                        <span className="truncate">{chain.name}</span>
                      </CardTitle>
                      {chain.comment ? (
                        <CardDescription className="line-clamp-2 mt-1">
                          {chain.comment}
                        </CardDescription>
                      ) : null}
                    </div>
                    <ArrowRightIcon className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    Updated{' '}
                    {formatDistanceToNow(new Date(chain.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="font-mono">
                    {String(chain.id).slice(0, 8)}…
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}

          {!isLoading && items.length === 0 ? (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>No production chains yet</CardTitle>
                <CardDescription>
                  Once chains are created on the API they'll show up here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      ) : null}

      {!isLoading && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) => goToChain(row.id)}
          emptyMessage="No production chains found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="chain"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
