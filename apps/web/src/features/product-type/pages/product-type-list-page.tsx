import { useEffect, useState } from 'react';
import { AlertCircleIcon, RefreshCwIcon, TagsIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { productTypeColumns } from '@/features/product-type/components/product-type-columns';
import { useProductTypeList } from '@/features/product-type/hooks/use-product-type-list';

const DEFAULT_PAGE_SIZE = 50;

export function ProductTypeListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProductTypeList({
      page,
      pageSize,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={TagsIcon}
        title="Product Types"
        subtitle="Catalog of product types ingested by the production chains."
        count={data ? total : undefined}
        noun="type"
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
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by acronym or name…',
        }}
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
          columns={productTypeColumns}
          emptyMessage="No product types found."
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
          noun="type"
          nounPlural="types"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
