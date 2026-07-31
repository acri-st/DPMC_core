import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listProcessingScripts,
  type ListProcessingScriptsParams,
} from '@/features/processing-script/services/processing-script.service';

export const processingScriptListKey = (params: ListProcessingScriptsParams) =>
  [
    'processing-script',
    'list',
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

export function useProcessingScriptList(params: ListProcessingScriptsParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: processingScriptListKey(params),
    queryFn: () => listProcessingScripts(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
