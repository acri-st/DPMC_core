import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listDataCenters,
  type ListDataCentersParams,
} from '@/features/data-center/services/data-center.service';

export const DATA_CENTER_LIST_BASE_KEY = ['data-center', 'list'] as const;
export const dataCenterListKey = (params: ListDataCentersParams) =>
  [
    ...DATA_CENTER_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

export function useDataCenterList(params: ListDataCentersParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: dataCenterListKey(params),
    queryFn: () => listDataCenters(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
