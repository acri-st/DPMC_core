import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getTask } from '@/features/task/services/task.service';

export const taskKey = (id: number | null) => ['task', 'detail', id] as const;

export function useTask(id: number | null) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: taskKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id)) throw new Error('No task id');
      return getTask(id);
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
  });
}
