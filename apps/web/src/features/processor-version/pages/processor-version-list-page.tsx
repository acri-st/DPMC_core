import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  AlertCircleIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { PagePagination } from '@/shared/components/page-pagination';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useProcessorVersionList } from '@/features/processor-version/hooks/use-processor-version-list';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { listAuxiliaryConfigurations } from '@/features/processor-version/services/processor-version.service';
import type { ProcessorVersion } from '@/features/processor-version/types';

const DEFAULT_PAGE_SIZE = 50;

export function ProcessorVersionListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { status } = useCurrentUser();
  const enabled = status === 'authenticated';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProcessorVersionList({
      page,
      pageSize,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
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

  const columns = useMemo<ColumnDef<ProcessorVersion>[]>(
    () => [
      {
        accessorKey: 'baseline',
        header: 'Baseline',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.baseline}</span>
        ),
      },
      {
        accessorKey: 'processingScriptVersionId',
        header: 'Script version',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {String(row.original.processingScriptVersionId).slice(0, 8)}
          </Badge>
        ),
      },
      {
        accessorKey: 'auxiliaryConfigurationId',
        header: 'Aux config',
        cell: ({ row }) => {
          const id = row.original.auxiliaryConfigurationId;
          return (
            <span className="text-xs">
              {auxNameById[id] ?? String(id).slice(0, 8)}
            </span>
          );
        },
      },
      {
        accessorKey: 'comment',
        header: 'Comment',
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {row.original.comment ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-xs">
            {format(new Date(row.original.createdAt), 'PP')}
          </span>
        ),
      },
    ],
    [auxNameById],
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={PackageIcon}
        title="Processor versions (SXAC)"
        subtitle="A frozen pairing of a script version and an auxiliary configuration. Used by tasks and chains."
        count={data ? total : undefined}
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
        <Button size="sm" asChild>
          <Link to="/processor-versions/new">
            <PlusIcon />
            New SXAC
          </Link>
        </Button>
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by baseline…',
        }}
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
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
