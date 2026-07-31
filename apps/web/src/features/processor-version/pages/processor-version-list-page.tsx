import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { buildProcessorVersionColumns } from '@/features/processor-version/components/processor-version-columns';
import { useProcessorVersionList } from '@/features/processor-version/hooks/use-processor-version-list';
import { listAuxiliaryConfigurations } from '@/features/processor-version/services/processor-version.service';

const DEFAULT_PAGE_SIZE = 50;

export function ProcessorVersionListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const { status } = useCurrentUser();
  const enabled = status === 'authenticated';

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProcessorVersionList({
      page: lp.page,
      pageSize: lp.pageSize,
      q: lp.trimmedQ || undefined,
    });
  const auxConfigs = useQuery({
    queryKey: ['auxiliary-configuration', 'list'],
    queryFn: listAuxiliaryConfigurations,
    enabled,
  });
  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const auxNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const a of auxConfigs.data ?? []) map[a.id] = a.name;
    return map;
  }, [auxConfigs.data]);

  const columns = useMemo(
    () => buildProcessorVersionColumns({ auxNameById }),
    [auxNameById],
  );

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={PackageIcon}
        title="Processor versions (SXAC)"
        subtitle="A frozen pairing of a script version and an auxiliary configuration. Used by tasks and chains."
        count={data ? total : undefined}
        noun="version"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by baseline…',
        }}
        actions={
          <>
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
            <Button size="sm" asChild>
              <Link to="/processor-versions/new">
                <PlusIcon />
                New SXAC
              </Link>
            </Button>
          </>
        }
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load processor versions'}</span>
        </div>
      ) : null}

      {isLoading ? <Skeleton className="h-80 w-full rounded-md" /> : null}

      {data ? (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No processor versions yet."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="version"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
