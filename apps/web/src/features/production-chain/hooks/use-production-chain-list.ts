import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import {
  listProductionChains,
  type ListProductionChainsParams,
} from '@/features/production-chain/services/production-chain.service';

export const PRODUCTION_CHAIN_LIST_BASE_KEY = [
  'production-chain',
  'list',
] as const;
export const productionChainListKey = (
  params: ListProductionChainsParams,
  projectId: number | null,
) =>
  [
    ...PRODUCTION_CHAIN_LIST_BASE_KEY,
    projectId,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

/** Default params fetch up to 500 chains — enough for lookup callers. */
export function useProductionChainList(
  params: ListProductionChainsParams = { page: 1, pageSize: 500 },
) {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: productionChainListKey(params, projectId),
    queryFn: () => listProductionChains(params),
    enabled: status === 'authenticated' && Boolean(project.data),
    placeholderData: keepPreviousData,
  });
}
