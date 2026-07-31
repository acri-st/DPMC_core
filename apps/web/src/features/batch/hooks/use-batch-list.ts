import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import {
  listBatches,
  type ListBatchesParams,
} from '@/features/batch/services/batch.service';

export const BATCH_LIST_BASE_KEY = ['batch', 'list'] as const;

export const batchListKey = (
  params: ListBatchesParams,
  projectId: number | null,
) =>
  [
    ...BATCH_LIST_BASE_KEY,
    projectId,
    params.page,
    params.pageSize,
    params.q ?? '',
    (params.status ?? []).join(','),
    (params.kind ?? []).join(','),
    params.sort ?? '',
    params.order ?? '',
  ] as const;

export function useBatchList(params: ListBatchesParams) {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: batchListKey(params, projectId),
    queryFn: () => listBatches(params),
    enabled: status === 'authenticated' && Boolean(project.data),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}
