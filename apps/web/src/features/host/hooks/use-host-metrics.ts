import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { listHostMetrics } from '@/features/host/services/host.service';

const REFETCH_INTERVAL_MS = 10_000;

export const hostMetricsKey = (id: number | null) =>
  ['host', 'metrics', id] as const;

export function useHostMetrics(id: number | null, limit = 60) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: hostMetricsKey(id),
    queryFn: () => {
      if (id == null || Number.isNaN(id))
        throw new Error('Host id is required');
      return listHostMetrics(id, { limit });
    },
    enabled: id != null && !Number.isNaN(id) && status === 'authenticated',
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
