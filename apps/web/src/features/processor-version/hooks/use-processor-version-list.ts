import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listProcessorVersions,
  type ListProcessorVersionsParams,
} from '@/features/processor-version/services/processor-version.service';

export const PROCESSOR_VERSION_LIST_BASE_KEY = [
  'processor-version',
  'list',
] as const;
export const processorVersionListKey = (params: ListProcessorVersionsParams) =>
  [
    ...PROCESSOR_VERSION_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

export function useProcessorVersionList(params: ListProcessorVersionsParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: processorVersionListKey(params),
    queryFn: () => listProcessorVersions(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
