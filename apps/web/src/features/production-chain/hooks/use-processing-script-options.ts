import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { listProcessingScripts } from '@/features/production-chain/services/production-chain.service';

export const processingScriptOptionsKey = ['processing-script', 'options'] as const;

/**
 * Processing scripts are global system resources (not project-scoped), so the
 * query key intentionally omits projectId — unlike production-chain queries.
 */
export function useProcessingScriptOptions() {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: processingScriptOptionsKey,
    queryFn: listProcessingScripts,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}
