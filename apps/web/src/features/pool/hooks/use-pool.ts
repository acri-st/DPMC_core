import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getPool } from '@/features/pool/services/pool.service';

export const poolKey = (id: number | null) => ['pool', 'detail', id] as const;

export function usePool(id: number | null) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: poolKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id))
        throw new Error('Pool id is required');
      return getPool(id);
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
  });
}
