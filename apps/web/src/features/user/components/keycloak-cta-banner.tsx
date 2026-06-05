import { ExternalLinkIcon, KeyRoundIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { getKeycloakAdminUsersUrl } from '@/features/user/utils/keycloak-admin-url';

export function KeycloakCtaBanner() {
  const href = getKeycloakAdminUsersUrl();
  return (
    <div className="bg-muted/40 border-muted-foreground/20 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <KeyRoundIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Permissions are managed in Keycloak</p>
          <p className="text-muted-foreground text-xs">
            DPMC reads roles from the Keycloak realm. Use the Keycloak admin
            console to assign or revoke permissions.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5"
        >
          Open Keycloak admin
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </Button>
    </div>
  );
}
