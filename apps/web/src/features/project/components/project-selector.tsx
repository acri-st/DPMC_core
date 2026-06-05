import { Link } from '@tanstack/react-router';
import { FolderIcon } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';
import { useProjectList } from '@/features/project/hooks/use-project-list';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import { useSetCurrentProject } from '@/features/project/hooks/use-set-current-project';

export function ProjectSelector() {
  const projects = useProjectList();
  const current = useCurrentProject();
  const setCurrent = useSetCurrentProject();
  const isAdmin = useIsAdmin();

  const items = (projects.data?.items ?? []).filter(
    (p) => p.isActive && !p.deletedAt,
  );

  if (current.isLoading || projects.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <FolderIcon className="size-4" />
        Loading projects…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <FolderIcon className="size-4" />
        {isAdmin ? (
          <Link
            to="/admin/projects/new"
            className="underline-offset-2 hover:underline"
          >
            Create your first project
          </Link>
        ) : (
          'Ask an admin to create a project'
        )}
      </div>
    );
  }

  return (
    <Select
      value={current.data?.id != null ? String(current.data.id) : ''}
      onValueChange={(id) => setCurrent.mutate(Number(id))}
    >
      <SelectTrigger className="h-8 w-56">
        <FolderIcon className="size-4 shrink-0" />
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent>
        {items.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            <div className="flex items-center gap-2">
              <span className="truncate">{p.name}</span>
              {p.isDefault ? (
                <Badge variant="outline" className="text-[10px]">
                  Default
                </Badge>
              ) : null}
            </div>
          </SelectItem>
        ))}
        {isAdmin ? (
          <div className="border-t mt-1 pt-1 px-2 pb-1">
            <Link
              to="/admin/projects"
              className="text-muted-foreground hover:text-foreground block text-xs"
            >
              Manage projects →
            </Link>
          </div>
        ) : null}
      </SelectContent>
    </Select>
  );
}
