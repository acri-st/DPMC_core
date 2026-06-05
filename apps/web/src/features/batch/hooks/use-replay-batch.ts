import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BATCH_LIST_BASE_KEY } from '@/features/batch/hooks/use-batch-list';
import { replayBatch } from '@/features/batch/services/batch.service';

export function useReplayBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => replayBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BATCH_LIST_BASE_KEY });
    },
  });
}
