import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listHosts,
  type ListHostsParams,
} from '@/features/host/services/host.service';

export const HOST_LIST_BASE_KEY = ['host', 'list'] as const;
export const hostListKey = (params: ListHostsParams) =>
  [
    ...HOST_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
    (params.status ?? []).join(','),
    (params.containerRuntime ?? []).join(','),
    params.sort ?? '',
    params.order ?? '',
  ] as const;

export function useHostList(params: ListHostsParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: hostListKey(params),
    queryFn: () => listHosts(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
