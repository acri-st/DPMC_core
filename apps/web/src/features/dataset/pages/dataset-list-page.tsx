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
import { PageHeader } from '@/shared/components/page-header';
import { buildDatasetColumns } from '@/features/dataset/components/dataset-columns';
import { DatasetCreateDialog } from '@/features/dataset/components/dataset-create-dialog';
import { useDatasetList } from '@/features/dataset/hooks/use-dataset-list';

export function DatasetListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const datasetsQuery = useDatasetList();

  const columns = useMemo(() => buildDatasetColumns(), []);

  const total = datasetsQuery.data?.total ?? 0;
  const items = datasetsQuery.data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={DatabaseIcon}
        title="Datasets"
        subtitle="Reusable bundles of Products with role labels — used as Batch inputs/outputs."
        count={datasetsQuery.data ? total : undefined}
        noun="dataset"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => datasetsQuery.refetch()}
          disabled={datasetsQuery.isFetching}
        >
          <RefreshCwIcon
            className={datasetsQuery.isFetching ? 'animate-spin' : undefined}
          />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          New Dataset
        </Button>
      </PageHeader>

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
          emptyMessage="No datasets yet. Create one or run a Batch to produce a Dataset output."
        />
      ) : null}

      <DatasetCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
