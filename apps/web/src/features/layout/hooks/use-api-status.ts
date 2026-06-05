import { useQuery } from '@tanstack/react-query';

import { getApiStatus } from '../services/status.service';

export function useApiStatus() {
  return useQuery({
    queryKey: ['api-status'],
    queryFn: getApiStatus,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
