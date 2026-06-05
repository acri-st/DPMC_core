import { useEffect, useState } from 'react';
import { AlertCircleIcon, RefreshCwIcon, UsersIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { PagePagination } from '@/shared/components/page-pagination';
import { KeycloakCtaBanner } from '@/features/user/components/keycloak-cta-banner';
import { userColumns } from '@/features/user/components/user-columns';
import { useUserList } from '@/features/user/hooks/use-user-list';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

const DEFAULT_PAGE_SIZE = 50;

export function UserListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useUserList({
    page,
    pageSize,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={UsersIcon}
        title="Users"
        subtitle="People who have signed in to DPMC. Permissions are read from Keycloak."
        count={data ? total : undefined}
        noun="user"
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

      <KeycloakCtaBanner />

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by name or email…',
        }}
      />

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
          columns={userColumns}
          emptyMessage="No users found."
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
          noun="user"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
