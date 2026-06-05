import { useMutation, useQueryClient } from '@tanstack/react-query';

import { POOL_LIST_BASE_KEY } from '@/features/pool/hooks/use-pool-list';
import { poolKey } from '@/features/pool/hooks/use-pool';
import { updatePool } from '@/features/pool/services/pool.service';
import type { UpdatePoolBody } from '@dpmc/client';

export function useUpdatePool(poolId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePoolBody) => updatePool(poolId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKey(poolId) });
      queryClient.invalidateQueries({ queryKey: POOL_LIST_BASE_KEY });
    },
  });
}
