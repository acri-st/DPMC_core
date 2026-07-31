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
import { ListHeader } from '@/shared/components/list-header';
import { useListParams } from '@/shared/hooks/use-list-params';
import { PagePagination } from '@/shared/components/page-pagination';
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
  const lp = useListParams({
    filterKeys: [],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProjectList({
      page: lp.page,
      pageSize: lp.pageSize,
      q: lp.trimmedQ || undefined,
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
    <div className="flex flex-1 flex-col gap-2">
      <ListHeader
        icon={FolderIcon}
        title="Projects"
        subtitle="Manage projects, defaults, and activation. Visible to admins."
        count={data ? total : undefined}
        noun="project"
        search={{
          value: lp.q,
          onChange: lp.setQ,
          placeholder: 'Search by identifier or name…',
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
            <Button asChild size="sm">
              <Link to="/admin/projects/new">
                <PlusIcon />
                New project
              </Link>
            </Button>
          </>
        }
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
          page={lp.page}
          pageSize={lp.pageSize}
          total={total}
          onPageChange={lp.setPage}
          onPageSizeChange={lp.setPageSize}
          noun="project"
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
