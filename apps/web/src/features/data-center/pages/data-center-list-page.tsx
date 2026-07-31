import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, BoxIcon, MapIcon, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
} from '@/shared/components/ui/collapsible';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { useListParams } from '@/shared/hooks/use-list-params';
import { PagePagination } from '@/shared/components/page-pagination';
import { DataCenterCard } from '@/features/data-center/components/data-center-card';
import { buildDataCenterColumns } from '@/features/data-center/components/data-center-columns';
import { DataCenterMap } from '@/features/data-center/components/data-center-map';
import { useDataCenterList } from '@/features/data-center/hooks/use-data-center-list';

const DEFAULT_PAGE_SIZE = 50;

export function DataCenterListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('data-centers', 'list');
  const [mapOpen, setMapOpen] = useState(true);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useDataCenterList({
      page: lp.page,
      pageSize: lp.pageSize,
      q: lp.trimmedQ || undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const columns = buildDataCenterColumns({
    onView: (id) =>
      navigate({ to: '/data-center/$id', params: { id: String(id) } }),
  });

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={BoxIcon}
        title="Data centers"
        subtitle="Hosting sites and their environmental characteristics."
        count={data ? total : undefined}
        noun="center"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name or code…',
        }}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapOpen((o) => !o)}
            >
              <MapIcon className="size-3.5" />
              {mapOpen ? 'Hide map' : 'Show map'}
            </Button>
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
          </>
        }
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load data centers'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      ) : null}

      {data && items.length > 0 ? (
        <Collapsible open={mapOpen} onOpenChange={setMapOpen}>
          <CollapsibleContent>
            <DataCenterMap dataCenters={items} className="h-48" />
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {data && viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((dc) => (
            <DataCenterCard key={dc.id} dataCenter={dc} />
          ))}
        </div>
      ) : null}

      {data && viewMode === 'table' ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({ to: '/data-center/$id', params: { id: String(row.id) } })
          }
          emptyMessage="No data centers found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="center"
          nounPlural="centers"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
