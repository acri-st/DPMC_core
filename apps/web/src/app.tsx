import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { router } from '@/router';
import { ThemeApplier } from '@/shared/components/theme-applier';
import { Toaster } from '@/shared/components/ui/sonner';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { SettingsSync } from '@/features/settings/components/settings-sync';
import { queryClient } from '@/shared/libs/query-client';

export function App() {
  return (
    <>
      <ThemeApplier />
      <QueryClientProvider client={queryClient}>
        <SettingsSync />
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </QueryClientProvider>
      <Toaster richColors position="top-right" />
    </>
  );
}
