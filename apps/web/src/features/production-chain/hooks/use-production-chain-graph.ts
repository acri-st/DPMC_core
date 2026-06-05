import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getProductionChainGraph } from '@/features/production-chain/services/production-chain.service';

export const productionChainGraphKey = (
  id: string | null,
  versionId: string | null = null,
) => ['production-chain', 'graph', id, versionId] as const;

export function useProductionChainGraph(
  id: string | null,
  versionId: string | null = null,
) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: productionChainGraphKey(id, versionId),
    queryFn: () => {
      if (!id) {
        throw new Error('No production chain selected');
      }
      return getProductionChainGraph(id, versionId);
    },
    enabled: Boolean(id) && status === 'authenticated',
  });
}
