import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';

/**
 * Production-chain node/edge mutations are authorized for admin AND operator
 * server-side (`@ProjectScoped('admin','operator')`), so the editor UI must be
 * available to both — not just admins.
 */
export function useCanEditProductionChain(): boolean {
  const isAdmin = useIsAdmin();
  const { data } = useCurrentUser();
  return isAdmin || (data?.roles?.includes('operator') ?? false);
}
