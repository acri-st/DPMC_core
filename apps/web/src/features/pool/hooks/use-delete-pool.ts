import { useMutation, useQueryClient } from '@tanstack/react-query';

import { POOL_LIST_BASE_KEY } from '@/features/pool/hooks/use-pool-list';
import { deletePool } from '@/features/pool/services/pool.service';

export function useDeletePool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POOL_LIST_BASE_KEY });
    },
  });
}
