import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchCurrentUser,
  logout,
} from '@/features/auth/services/auth.service';

export const currentUserKey = ['auth', 'me'] as const;

export function useCurrentUser() {
  const query = useQuery({
    queryKey: currentUserKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const status: 'loading' | 'authenticated' | 'unauthenticated' =
    query.isPending
      ? 'loading'
      : query.data
        ? 'authenticated'
        : 'unauthenticated';
  return { ...query, status };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.setQueryData(currentUserKey, null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
