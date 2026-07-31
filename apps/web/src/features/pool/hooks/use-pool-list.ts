import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listPools,
  type ListPoolsParams,
} from '@/features/pool/services/pool.service';

export const POOL_LIST_BASE_KEY = ['pool', 'list'] as const;
export const poolListKey = (params: ListPoolsParams) =>
  [
    ...POOL_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
    params.sort ?? '',
    params.order ?? '',
  ] as const;

export function usePoolList(params: ListPoolsParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: poolListKey(params),
    queryFn: () => listPools(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
