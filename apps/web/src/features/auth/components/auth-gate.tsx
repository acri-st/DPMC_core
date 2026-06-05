import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircleIcon, Loader2Icon, LogInIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { getLoginUrl } from '@/features/auth/services/auth.service';

const ERRORS: Record<string, string> = {
  state_mismatch: 'Authentication state mismatch. Please try again.',
  oauth_state_missing: 'The login session expired. Please retry.',
  oauth_state_invalid: 'Authentication state was invalid. Please retry.',
  token_exchange: 'Could not exchange the authorization code with Keycloak.',
  missing_code: 'Authorization code missing in the redirect.',
  access_denied: 'Login was cancelled.',
};

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useCurrentUser();
  const [authError, setAuthError] = useState<string | null>(null);

  // Pluck ?auth_error=… on first render and clean the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const err = url.searchParams.get('auth_error');
    if (err) {
      setAuthError(err);
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const open = status !== 'authenticated';

  return (
    <>
      {children}
      <DialogPrimitive.Root open={open} modal>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-background/40 backdrop-blur-md',
              'data-open:animate-in data-open:fade-in-0',
              'data-closed:animate-out data-closed:fade-out-0',
            )}
          />
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className={cn(
              'bg-card text-card-foreground fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-xl',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            )}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <LogInIcon className="size-5" />
              </div>
              <DialogPrimitive.Title className="text-lg font-semibold">
                Sign in to DPMC
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground text-sm">
                Authenticate with Keycloak to access the dashboard.
              </DialogPrimitive.Description>
            </div>

            {authError ? (
              <div className="text-destructive mt-4 flex items-start gap-2 rounded-md border p-3 text-xs">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span>{ERRORS[authError] ?? authError}</span>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={() => {
                  const returnTo =
                    typeof window === 'undefined'
                      ? '/'
                      : window.location.pathname + window.location.search;
                  window.location.assign(getLoginUrl(returnTo));
                }}
                disabled={status === 'loading'}
                className="w-full"
              >
                {status === 'loading' ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <LogInIcon />
                )}
                Continue with Keycloak
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
