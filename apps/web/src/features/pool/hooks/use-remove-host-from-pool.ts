import { useMutation, useQueryClient } from '@tanstack/react-query';

import { poolKey } from '@/features/pool/hooks/use-pool';
import { removeHostFromPool } from '@/features/pool/services/pool.service';

export function useRemoveHostFromPool(poolId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hostId: number) => removeHostFromPool(poolId, hostId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKey(poolId) });
    },
  });
}
