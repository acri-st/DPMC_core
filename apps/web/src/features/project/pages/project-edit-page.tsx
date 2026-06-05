import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, FolderPenIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  ProjectForm,
  type ProjectFormValues,
} from '@/features/project/components/project-form';
import {
  getProject,
  updateProject,
} from '@/features/project/services/project.service';
import { ProjectListRouteGuard } from './project-list-route-guard';

export function ProjectEditPage() {
  return (
    <ProjectListRouteGuard>
      <ProjectEditPageInner />
    </ProjectListRouteGuard>
  );
}

function ProjectEditPageInner() {
  const { id: idParam } = useParams({ strict: false }) as { id: string };
  const id = Number(idParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const project = useQuery({
    queryKey: ['project', 'detail', id],
    queryFn: () => getProject(id),
    enabled: !Number.isNaN(id),
  });

  const update = useMutation({
    mutationFn: (values: ProjectFormValues) => updateProject(id, values),
    onSuccess: () => {
      toast.success('Project updated');
      queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['project', 'detail', id] });
      void navigate({ to: '/admin/projects' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (project.isLoading || !project.data) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/projects">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <FolderPenIcon className="size-5" />
            Edit {project.data.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Update name, defaults, and activation flags.
          </p>
        </div>
      </div>
      <ProjectForm
        initial={project.data}
        submitLabel="Save"
        onSubmit={(v) => update.mutate(v)}
        isSubmitting={update.isPending}
      />
    </div>
  );
}
