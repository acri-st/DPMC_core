import { createCipheriv, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { CONFIG } from '../constants/config';
import { keycloak } from '../setup/services/keycloak';
import type { TestRole } from './auth';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const USER_BY_ROLE: Record<TestRole, { username: string; password: string }> = {
  admin: { username: 'admin', password: 'admin' },
  operator: { username: 'operator', password: 'operator' },
  'internal-viewer': { username: 'internal-viewer', password: 'internal-viewer' },
  'external-viewer': { username: 'external-viewer', password: 'external-viewer' },
};

interface SessionContext {
  /** Cookie value to set on supertest requests via `.set('Cookie', cookie)`. */
  cookie: string;
  /** App-side user.id (UUID) — handy for assertions. */
  userId: string;
}

const sessionCache = new Map<TestRole, SessionContext>();

/**
 * Forges a server-side session for the given preset role and returns the
 * Set-Cookie value the client must echo back. The session row is encrypted
 * exactly like the OAuth callback would, so SessionGuard accepts it without
 * any test-only branching in the API.
 *
 * Sessions are cached per role for the lifetime of the test process.
 */
export async function asSession(role: TestRole): Promise<SessionContext> {
  const cached = sessionCache.get(role);
  if (cached) return cached;

  const { username, password } = USER_BY_ROLE[role];
  const tokens = await keycloak.requestTokens(username, password);
  const claims = decodeJwt(tokens.access_token);

  const userId = await upsertUser({
    keycloakSub: claims.sub,
    email: claims.email ?? `${username}@test.local`,
    displayName: claims.preferred_username ?? username,
  });

  const sessionId = await insertSession({
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    refreshTokenExpiresAt: new Date(Date.now() + tokens.refresh_expires_in * 1000),
  });

  const ctx: SessionContext = {
    cookie: `${CONFIG.session.cookieName}=${sessionId}`,
    userId,
  };
  sessionCache.set(role, ctx);
  return ctx;
}

export const asAdminSession = () => asSession('admin');
export const asOperatorSession = () => asSession('operator');
export const asInternalViewerSession = () => asSession('internal-viewer');
export const asExternalViewerSession = () => asSession('external-viewer');

interface JwtClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
}

function decodeJwt(token: string): JwtClaims {
  const [, payload] = token.split('.');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json);
}

/**
 * Mirrors apps/api/src/core/crypto/crypto.service.ts: AES-256-GCM with a
 * 12-byte IV prepended and a 16-byte auth tag right after.
 */
function encrypt(plaintext: string): Buffer {
  const key = Buffer.from(CONFIG.session.encryptionKey, 'base64');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

async function withDbClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function upsertUser(opts: {
  keycloakSub: string;
  email: string;
  displayName: string;
}): Promise<string> {
  return withDbClient(async (c) => {
    const existing = await c.query<{ id: string }>(
      `SELECT id FROM "user" WHERE "keycloakSub" = $1`,
      [opts.keycloakSub],
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
    const inserted = await c.query<{ id: string }>(
      `INSERT INTO "user" (id, "keycloakSub", email, "displayName", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       RETURNING id`,
      [opts.keycloakSub, opts.email, opts.displayName],
    );
    return inserted.rows[0].id;
  });
}

async function insertSession(opts: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}): Promise<string> {
  return withDbClient(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO "session"
         (id, "userId", "accessToken", "refreshToken",
          "accessTokenExpiresAt", "refreshTokenExpiresAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id`,
      [
        opts.userId,
        encrypt(opts.accessToken),
        encrypt(opts.refreshToken),
        opts.accessTokenExpiresAt,
        opts.refreshTokenExpiresAt,
      ],
    );
    return r.rows[0].id;
  });
}
