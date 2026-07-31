import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getProcessingScript } from '@/features/processing-script/services/processing-script.service';

export function useProcessingScript(id: number) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: ['processing-script', id],
    queryFn: () => getProcessingScript(id),
    enabled: status === 'authenticated' && !Number.isNaN(id),
  });
}
