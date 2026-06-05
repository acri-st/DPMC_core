import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getTaskBatches } from '@/features/task/services/task.service';

export const taskBatchesKey = (id: number | null) =>
  ['task', 'batches', id] as const;

export function useTaskBatches(id: number | null) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: taskBatchesKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id)) throw new Error('No task id');
      return getTaskBatches(id);
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
    refetchInterval: 5_000,
  });
}
