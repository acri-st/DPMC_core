import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, FolderPlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  ProjectForm,
  type ProjectFormValues,
} from '@/features/project/components/project-form';
import { createProject } from '@/features/project/services/project.service';
import { ProjectListRouteGuard } from './project-list-route-guard';

export function ProjectCreatePage() {
  return (
    <ProjectListRouteGuard>
      <ProjectCreatePageInner />
    </ProjectListRouteGuard>
  );
}

function ProjectCreatePageInner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (values: ProjectFormValues) => createProject(values),
    onSuccess: () => {
      toast.success('Project created');
      queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
      void navigate({ to: '/admin/projects' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
            <FolderPlusIcon className="size-5" />
            New project
          </h1>
          <p className="text-muted-foreground text-sm">
            Create a new project. The active project drives every scoped list.
          </p>
        </div>
      </div>
      <ProjectForm
        submitLabel="Create"
        onSubmit={(v) => create.mutate(v)}
        isSubmitting={create.isPending}
      />
    </div>
  );
}
