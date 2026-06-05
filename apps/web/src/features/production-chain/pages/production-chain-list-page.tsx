import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
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
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useProductionChainList } from '@/features/production-chain/hooks/use-production-chain-list';
import { CreateChainDialog } from '@/features/production-chain/components/create-chain-dialog';

const DEFAULT_PAGE_SIZE = 50;

export function ProductionChainListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProductionChainList({
      page,
      pageSize,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={WorkflowIcon}
        title="Production chains"
        subtitle="Browse the configured pipelines and inspect their execution graph."
        count={data ? total : undefined}
        noun="chain"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
          Refresh
        </Button>
        <CreateChainDialog />
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by name or comment…',
        }}
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load production chains'}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-md" />
            ))
          : null}

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
          noun="chain"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
