import { useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getDataset } from '@/features/dataset/services/dataset.service';

export const datasetDetailKey = (id: number) =>
  ['dataset', 'detail', id] as const;

export function useDataset(id: number) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: datasetDetailKey(id),
    queryFn: () => getDataset(id),
    enabled: status === 'authenticated' && !Number.isNaN(id),
  });
}
