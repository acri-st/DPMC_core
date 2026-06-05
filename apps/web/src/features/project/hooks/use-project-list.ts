import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listProjects,
  type ListProjectsParams,
} from '@/features/project/services/project.service';

export const PROJECT_LIST_BASE_KEY = ['project', 'list'] as const;
export const projectListKey = (params: ListProjectsParams) =>
  [
    ...PROJECT_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

/** Default params fetch up to 500 projects — enough for selectors and useCurrentProject. */
export function useProjectList(
  params: ListProjectsParams = { page: 1, pageSize: 500 },
) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: projectListKey(params),
    queryFn: () => listProjects(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
