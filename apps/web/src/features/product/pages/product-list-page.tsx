import { useMemo } from 'react';
import type { ProductType } from '@dpmc/client';
import { AlertCircleIcon, BoxesIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { buildProductColumns } from '@/features/product/components/product-columns';
import { useProductList } from '@/features/product/hooks/use-product-list';
import { useProductTypeList } from '@/features/product-type/hooks/use-product-type-list';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 50;

export function ProductListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const productsQuery = useProductList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    sort: lp.sort,
    order: lp.order,
  });
  const productTypesQuery = useProductTypeList({ page: 1, pageSize: 500 });

  const productTypeById = useMemo(() => {
    const map = new Map<number, ProductType>();
    for (const pt of productTypesQuery.data?.items ?? []) map.set(pt.id, pt);
    return map;
  }, [productTypesQuery.data]);

  const columns = useMemo(
    () => buildProductColumns(productTypeById),
    [productTypeById],
  );

  const total = productsQuery.data?.total ?? 0;
  const items = productsQuery.data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={BoxesIcon}
        title="Products"
        subtitle="Catalog of products available for production chain runs."
        count={productsQuery.data ? total : undefined}
        noun="product"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name…',
        }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => productsQuery.refetch()}
            disabled={productsQuery.isFetching}
          >
            <RefreshCwIcon
              className={productsQuery.isFetching ? 'animate-spin' : undefined}
            />
            Refresh
          </Button>
        }
      />

      {productsQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>
            {productsQuery.error?.message ?? 'Failed to load products'}
          </span>
        </div>
      ) : null}

      {productsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : null}

      {productsQuery.data ? (
        <DataTable
          data={items}
          columns={columns}
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          emptyMessage="No products found."
        />
      ) : null}

      {productsQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          noun="product"
          isFetching={productsQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
