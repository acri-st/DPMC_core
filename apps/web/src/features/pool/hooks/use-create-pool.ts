import { useMutation, useQueryClient } from '@tanstack/react-query';

import { POOL_LIST_BASE_KEY } from '@/features/pool/hooks/use-pool-list';
import { createPool } from '@/features/pool/services/pool.service';

export function useCreatePool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POOL_LIST_BASE_KEY });
    },
  });
}
