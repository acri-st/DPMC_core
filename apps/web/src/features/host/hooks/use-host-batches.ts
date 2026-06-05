import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { listHostBatches } from '@/features/host/services/host.service';

const REFETCH_INTERVAL_MS = 15_000;

export const hostBatchesKey = (id: number | null) =>
  ['host', 'batches', id] as const;

export function useHostBatches(id: number | null, limit = 10) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: hostBatchesKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id))
        throw new Error('Host id is required');
      return listHostBatches(id, { limit });
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
