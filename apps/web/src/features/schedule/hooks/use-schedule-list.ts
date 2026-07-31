import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import {
  listSchedules,
  type ListSchedulesParams,
} from '@/features/schedule/services/schedule.service';

export const scheduleListKey = (
  params: ListSchedulesParams,
  projectId: number | null,
) =>
  [
    'task-schedule',
    'list',
    projectId,
    params.page,
    params.pageSize,
    params.q ?? '',
    (params.kind ?? []).join(','),
    String(params.enabled ?? ''),
    params.sort ?? '',
    params.order ?? '',
  ] as const;

export const scheduleGetKey = (id: number) =>
  ['task-schedule', 'get', id] as const;

export function useScheduleList(params: ListSchedulesParams) {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: scheduleListKey(params, projectId),
    queryFn: () => listSchedules(params),
    enabled: status === 'authenticated' && Boolean(project.data),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}
