import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patchMeSettings } from '@/features/settings/services/settings.service';

const SCOPED_KEYS = [
  ['task', 'list'],
  ['batch', 'list'],
  ['job', 'list'],
  ['production-chain', 'list'],
] as const;

export function useSetCurrentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number | null) =>
      patchMeSettings({ lastProjectId: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'settings'] });
      for (const key of SCOPED_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
