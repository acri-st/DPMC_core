import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, FileCode2Icon, RefreshCwIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { buildProcessingScriptColumns } from '@/features/processing-script/components/processing-script-columns';
import { useProcessingScriptList } from '@/features/processing-script/hooks/use-processing-script-list';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 50;

export function ProcessingScriptListPage() {
  const navigate = useNavigate();
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const scriptsQuery = useProcessingScriptList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
  });

  const columns = useMemo(() => buildProcessingScriptColumns(), []);

  const total = scriptsQuery.data?.total ?? 0;
  const items = scriptsQuery.data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={FileCode2Icon}
        title="Processing Scripts"
        subtitle="Catalog of processing scripts available for production chains."
        count={scriptsQuery.data ? total : undefined}
        noun="script"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name or acronym…',
        }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => scriptsQuery.refetch()}
            disabled={scriptsQuery.isFetching}
          >
            <RefreshCwIcon
              className={scriptsQuery.isFetching ? 'animate-spin' : undefined}
            />
            Refresh
          </Button>
        }
      />

      {scriptsQuery.isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>
            {scriptsQuery.error?.message ?? 'Failed to load processing scripts'}
          </span>
        </div>
      ) : null}

      {scriptsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : null}

      {scriptsQuery.data ? (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No processing scripts found."
          onRowClick={(row) =>
            navigate({
              to: '/processing-scripts/$id',
              params: { id: String(row.id) },
            })
          }
        />
      ) : null}

      {scriptsQuery.data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          noun="script"
          isFetching={scriptsQuery.isFetching}
        />
      ) : null}
    </div>
  );
}
