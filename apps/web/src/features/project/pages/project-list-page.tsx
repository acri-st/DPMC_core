import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  FolderIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { PagePagination } from '@/shared/components/page-pagination';
import { PageToolbar } from '@/shared/components/page-toolbar';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { buildProjectColumns } from '@/features/project/components/project-columns';
import {
  PROJECT_LIST_BASE_KEY,
  useProjectList,
} from '@/features/project/hooks/use-project-list';
import {
  deleteProject,
  setDefaultProject,
} from '@/features/project/services/project.service';
import { ProjectListRouteGuard } from './project-list-route-guard';

const DEFAULT_PAGE_SIZE = 50;

export function ProjectListPage() {
  return (
    <ProjectListRouteGuard>
      <ProjectListPageInner />
    </ProjectListRouteGuard>
  );
}

function ProjectListPageInner() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedQ = debouncedSearch.trim();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [trimmedQ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProjectList({
      page,
      pageSize,
      q: trimmedQ.length > 0 ? trimmedQ : undefined,
    });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const setDefault = useMutation({
    mutationFn: (id: number) => setDefaultProject(id),
    onSuccess: () => {
      toast.success('Default project updated');
      queryClient.invalidateQueries({ queryKey: PROJECT_LIST_BASE_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      toast.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: PROJECT_LIST_BASE_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = buildProjectColumns({
    setDefault,
    remove,
    onEdit: (id) =>
      navigate({ to: '/admin/projects/$id/edit', params: { id: String(id) } }),
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={FolderIcon}
        title="Projects"
        subtitle="Manage projects, defaults, and activation. Visible to admins."
        count={data ? total : undefined}
        noun="project"
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
        <Button asChild size="sm">
          <Link to="/admin/projects/new">
            <PlusIcon />
            New project
          </Link>
        </Button>
      </PageHeader>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by identifier or name…',
        }}
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load projects'}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : null}

      {data ? (
        <DataTable
          data={items}
          columns={columns}
          onRowClick={(row) =>
            navigate({
              to: '/admin/projects/$id/edit',
              params: { id: String(row.id) },
            })
          }
          emptyMessage="No projects found."
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
          noun="project"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
