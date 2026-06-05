import { useEffect, useMemo, useState } from 'react';
import type { ProductType } from '@dpmc/client';
import { AlertCircleIcon, BoxesIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { buildProductColumns } from '@/features/product/components/product-columns';
import { useProductList } from '@/features/product/hooks/use-product-list';
import { useProductTypeList } from '@/features/product-type/hooks/use-product-type-list';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 50;

export function ProductListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const productsQuery = useProductList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
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
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={BoxesIcon}
        title="Products"
        subtitle="Catalog of products available for production chain runs."
        count={productsQuery.data ? total : undefined}
        noun="product"
      >
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
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by name…',
        }}
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
          emptyMessage="No products found."
        />
      ) : null}

      {productsQuery.data ? (
        <PagePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          noun="product"
          isFetching={productsQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
