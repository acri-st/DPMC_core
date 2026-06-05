import { useQuery } from '@tanstack/react-query';
import type { Project } from '@dpmc/client';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { fetchMeSettings } from '@/features/settings/services/settings.service';
import { listProjects } from '@/features/project/services/project.service';
import { projectListKey } from './use-project-list';

const LOOKUP_PARAMS = { page: 1, pageSize: 500 } as const;

export function useCurrentProject(): {
  data: Project | null;
  isLoading: boolean;
} {
  const { status } = useCurrentUser();
  const enabled = status === 'authenticated';

  const settings = useQuery({
    queryKey: ['me', 'settings'],
    queryFn: fetchMeSettings,
    enabled,
  });
  const projects = useQuery({
    queryKey: projectListKey(LOOKUP_PARAMS),
    queryFn: () => listProjects(LOOKUP_PARAMS),
    enabled,
  });

  // Resolve from cached data whenever it's available — don't flash "loading"
  // just because `enabled` flipped briefly during a route transition.
  if (!projects.data) {
    return { data: null, isLoading: enabled };
  }

  const items = projects.data.items;

  const lastId = settings.data?.lastProjectId ?? null;
  if (lastId) {
    const fromSettings = items.find(
      (p) => p.id === lastId && p.isActive && !p.deletedAt,
    );
    if (fromSettings) return { data: fromSettings, isLoading: false };
  }

  const fromDefault =
    items.find((p) => p.isDefault && p.isActive && !p.deletedAt) ?? null;
  return { data: fromDefault, isLoading: false };
}
