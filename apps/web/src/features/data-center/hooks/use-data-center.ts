import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getDataCenter } from '@/features/data-center/services/data-center.service';

export const dataCenterKey = (id: number | null) =>
  ['data-center', 'detail', id] as const;

export function useDataCenter(id: number | null) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: dataCenterKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id))
        throw new Error('Data center id is required');
      return getDataCenter(id);
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
  });
}
