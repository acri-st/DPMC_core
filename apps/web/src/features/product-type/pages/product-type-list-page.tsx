import { useMemo } from 'react';
import { AlertCircleIcon, RefreshCwIcon, TagsIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { buildProductTypeColumns } from '@/features/product-type/components/product-type-columns';
import { useProductTypeList } from '@/features/product-type/hooks/use-product-type-list';

const DEFAULT_PAGE_SIZE = 50;

export function ProductTypeListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProductTypeList({
      page: lp.page,
      pageSize: lp.pageSize,
      q: lp.trimmedQ || undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const columns = useMemo(() => buildProductTypeColumns(), []);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={TagsIcon}
        title="Product Types"
        subtitle="Catalog of product types ingested by the production chains."
        count={data ? total : undefined}
        noun="type"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by acronym or name…',
        }}
        actions={
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
        }
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load product types'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : null}

      {data ? (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No product types found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="type"
          nounPlural="types"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
