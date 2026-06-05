import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import { listSchedules } from '@/features/schedule/services/schedule.service';

export const scheduleListKey = (projectId: number | null) =>
  ['task-schedule', 'list', projectId] as const;

export const scheduleGetKey = (id: number) =>
  ['task-schedule', 'get', id] as const;

export function useScheduleList() {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: scheduleListKey(projectId),
    queryFn: listSchedules,
    enabled: status === 'authenticated' && Boolean(project.data),
    refetchInterval: 30_000,
  });
}
