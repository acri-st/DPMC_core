import { Navigate } from '@tanstack/react-router';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';
import { UserListPage } from '@/features/user/pages/user-list-page';

export function UserListRouteGuard() {
  const { status } = useCurrentUser();
  const isAdmin = useIsAdmin();

  if (status === 'loading') {
    return <div className="text-muted-foreground p-4 text-sm">Loading…</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/overview" replace />;
  }

  return <UserListPage />;
}
