import { useMutation, useQueryClient } from '@tanstack/react-query';

import { poolKey } from '@/features/pool/hooks/use-pool';
import { addHostToPool } from '@/features/pool/services/pool.service';

export function useAddHostToPool(poolId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hostId: number) => addHostToPool(poolId, hostId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKey(poolId) });
    },
  });
}
