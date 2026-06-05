import { useCurrentUser } from '@/features/auth/hooks/use-current-user';

const ADMIN_ROLE =
  (import.meta.env.VITE_ADMIN_ROLE as string | undefined) ?? 'admin';

export function useIsAdmin(): boolean {
  const { data } = useCurrentUser();
  if (!data?.roles) return false;
  return data.roles.includes(ADMIN_ROLE);
}
