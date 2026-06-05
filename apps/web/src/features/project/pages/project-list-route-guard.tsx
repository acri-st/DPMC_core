import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';

export function ProjectListRouteGuard({ children }: { children: ReactNode }) {
  const { status } = useCurrentUser();
  const isAdmin = useIsAdmin();

  if (status !== 'authenticated') return null;
  if (!isAdmin) return <Navigate to="/overview" />;
  return <>{children}</>;
}
