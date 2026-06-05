/**
 * Build a deep link to the Keycloak admin console.
 *
 * Reads VITE_KEYCLOAK_URL and VITE_KEYCLOAK_REALM at build time.
 * Falls back to '#' when the env is not set so the CTA stays clickable
 * in dev environments without exploding.
 */
export function getKeycloakAdminUsersUrl(): string {
  const url = import.meta.env.VITE_KEYCLOAK_URL as string | undefined;
  const realm = import.meta.env.VITE_KEYCLOAK_REALM as string | undefined;
  if (!url || !realm) return '#';
  const base = url.replace(/\/$/, '');
  return `${base}/admin/master/console/#/${realm}/users`;
}

export function getKeycloakAdminUserUrl(userId: string): string {
  const url = import.meta.env.VITE_KEYCLOAK_URL as string | undefined;
  const realm = import.meta.env.VITE_KEYCLOAK_REALM as string | undefined;
  if (!url || !realm) return '#';
  const base = url.replace(/\/$/, '');
  return `${base}/admin/master/console/#/${realm}/users/${userId}/settings`;
}
