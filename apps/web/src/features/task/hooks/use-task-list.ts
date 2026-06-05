import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import {
  listTasks,
  type ListTasksParams,
} from '@/features/task/services/task.service';

export const taskListKey = (
  params: ListTasksParams,
  projectId: number | null,
) =>
  [
    'task',
    'list',
    projectId,
    params.page,
    params.pageSize,
    params.q ?? '',
    params.status ?? '',
    params.kind ?? '',
  ] as const;

export function useTaskList(params: ListTasksParams) {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: taskListKey(params, projectId),
    queryFn: () => listTasks(params),
    enabled: status === 'authenticated' && Boolean(project.data),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}
