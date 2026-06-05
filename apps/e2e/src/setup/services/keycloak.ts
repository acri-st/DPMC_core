import { CONFIG } from '../../constants/config';

const realmUrl = () =>
  `${CONFIG.keycloak.serverUrl}/realms/${CONFIG.keycloak.realm}`;
const tokenUrl = () => `${realmUrl()}/protocol/openid-connect/token`;

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export const keycloak = {
  async waitReady(timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs;
    const probe = realmUrl();
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(probe);
        if (res.ok) return;
        lastError = new Error(`status ${res.status}`);
      } catch (e) {
        lastError = e;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(
      `Keycloak did not become ready within ${timeoutMs}ms (last error: ${String(lastError)})`,
    );
  },

  async requestTokens(
    username: string,
    password: string,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: CONFIG.keycloak.clientId,
      client_secret: CONFIG.keycloak.clientSecret,
      username,
      password,
      scope: 'openid',
    });

    const res = await fetch(tokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Keycloak token request failed for ${username} (${res.status}): ${text}`,
      );
    }

    return (await res.json()) as TokenResponse;
  },

  async getAccessToken(username: string, password: string) {
    const now = Date.now();
    const cached = tokenCache.get(username);
    if (cached && cached.expiresAt > now + 5_000) return cached.token;

    const data = await this.requestTokens(username, password);
    tokenCache.set(username, {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    });
    return data.access_token;
  },

  clearCache() {
    tokenCache.clear();
  },
};
