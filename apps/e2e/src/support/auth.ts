import { CONFIG } from '../constants/config';
import { keycloak } from '../setup/services/keycloak';

export const API = CONFIG.api.url;

export type TestRole =
  | 'admin'
  | 'operator'
  | 'external-viewer'
  | 'internal-viewer';

type KeycloakUser = { username: string; password: string };

// Each preset matches a user defined in keycloak.json with the same username
// as their realm role. Passwords mirror usernames for deterministic e2e auth.
const USER_BY_ROLE: Record<TestRole, KeycloakUser> = {
  admin: { username: 'admin', password: 'admin' },
  operator: { username: 'operator', password: 'operator' },
  'internal-viewer': { username: 'internal-viewer', password: 'internal-viewer' },
  'external-viewer': { username: 'external-viewer', password: 'external-viewer' },
};

function pickUser(roles: readonly string[]): KeycloakUser {
  const primary = roles[0] as TestRole | undefined;
  if (primary && primary in USER_BY_ROLE) return USER_BY_ROLE[primary];
  // Fallback: a role that doesn't exist as a preset still uses internal-viewer
  // as the lowest-privilege real user. Tests that need a "no roles" path
  // should forge JWTs locally instead of relying on a missing realm user.
  return USER_BY_ROLE['internal-viewer'];
}

export async function authHeader(roles: readonly string[]) {
  const user = pickUser(roles);
  const token = await keycloak.getAccessToken(user.username, user.password);
  return { Authorization: `Bearer ${token}` };
}

export const asAdmin = () => authHeader(['admin']);
export const asOperator = () => authHeader(['operator']);
export const asInternalViewer = () => authHeader(['internal-viewer']);
export const asExternalViewer = () => authHeader(['external-viewer']);
