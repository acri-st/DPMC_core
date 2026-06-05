import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getHost } from '@/features/host/services/host.service';

export const hostKey = (id: number | null) => ['host', 'detail', id] as const;

export function useHost(id: number | null) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: hostKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id))
        throw new Error('Host id is required');
      return getHost(id);
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
  });
}
