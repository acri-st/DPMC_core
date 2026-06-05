import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';
import {
  listUsers,
  type ListUsersParams,
} from '@/features/user/services/user.service';

export const USER_LIST_BASE_KEY = ['user', 'list'] as const;
export const userListKey = (params: ListUsersParams) =>
  [
    ...USER_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

export function useUserList(params: ListUsersParams) {
  const { status } = useCurrentUser();
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: userListKey(params),
    queryFn: () => listUsers(params),
    enabled: status === 'authenticated' && isAdmin,
    placeholderData: keepPreviousData,
  });
}
