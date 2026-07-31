import { useMemo } from 'react';
import { AlertCircleIcon, RefreshCwIcon, UsersIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { ListHeader } from '@/shared/components/list-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { KeycloakCtaBanner } from '@/features/user/components/keycloak-cta-banner';
import { buildUserColumns } from '@/features/user/components/user-columns';
import { useUserList } from '@/features/user/hooks/use-user-list';

const DEFAULT_PAGE_SIZE = 50;

export function UserListPage() {
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useUserList({
    page: lp.page,
    pageSize: lp.pageSize,
    q: lp.trimmedQ || undefined,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const columns = useMemo(() => buildUserColumns(), []);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={UsersIcon}
        title="Users"
        subtitle="People who have signed in to DPMC. Permissions are read from Keycloak."
        count={data ? total : undefined}
        noun="user"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by name or email…',
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

      <KeycloakCtaBanner />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load users'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : null}

      {data ? (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No users found."
        />
      ) : null}

      {data ? (
        <PagePagination
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="user"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
