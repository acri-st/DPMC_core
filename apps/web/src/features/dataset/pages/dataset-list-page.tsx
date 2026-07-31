import { useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  DatabaseIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useListParams } from '@/shared/hooks/use-list-params';
import { buildDatasetColumns } from '@/features/dataset/components/dataset-columns';
import { DatasetCreateDialog } from '@/features/dataset/components/dataset-create-dialog';
import { useDatasetList } from '@/features/dataset/hooks/use-dataset-list';

const DEFAULT_PAGE_SIZE = 50;

type DatasetOrigin = 'batch' | 'manual' | 'user' | 'system' | 'all';

export function DatasetListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const [origin, setOrigin] = useState<DatasetOrigin>('user');

  const changeOrigin = (v: DatasetOrigin) => {
    setOrigin(v);
    lp.setPage(1);
  };

  const datasetsQuery = useDatasetList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
    origin,
    sort: lp.sort,
    order: lp.order,
  });

  const columns = useMemo(() => buildDatasetColumns(), []);

  const total = datasetsQuery.data?.total ?? 0;
  const items = datasetsQuery.data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={DatabaseIcon}
        title="Datasets"
        subtitle="Reusable bundles of Products with role labels — used as Batch inputs/outputs."
        count={datasetsQuery.data ? total : undefined}
        noun="dataset"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name…',
        }}
        filters={
          <Select
            value={origin}
            onValueChange={(v) => changeOrigin(v as DatasetOrigin)}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User datasets</SelectItem>
              <SelectItem value="batch">Batch output</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="system">System (runtime)</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => datasetsQuery.refetch()}
              disabled={datasetsQuery.isFetching}
            >
              <RefreshCwIcon
                className={
                  datasetsQuery.isFetching ? 'animate-spin' : undefined
                }
              />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New Dataset
            </Button>
          </>
        }
      />

      {datasetsQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>
            {datasetsQuery.error?.message ?? 'Failed to load datasets'}
          </span>
        </div>
      ) : null}

      {datasetsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : null}

      {datasetsQuery.data ? (
        <DataTable
          data={items}
          columns={columns}
          sorting={lp.sorting}
          onSortingChange={lp.setSorting}
          emptyMessage="No datasets yet. Create one or run a Batch to produce a Dataset output."
        />
      ) : null}

      {datasetsQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="dataset"
          isFetching={datasetsQuery.isFetching}
        />
      ) : null}

      <DatasetCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
