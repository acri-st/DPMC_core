import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listDatasets,
  type ListDatasetsParams,
} from '@/features/dataset/services/dataset.service';

export const datasetListKey = (params: ListDatasetsParams) =>
  [
    'dataset',
    'list',
    params.page ?? 1,
    params.pageSize ?? 100,
    params.producedByBatchId ?? '',
    params.name ?? '',
  ] as const;

export function useDatasetList(params: ListDatasetsParams = {}) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: datasetListKey(params),
    queryFn: () => listDatasets(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
