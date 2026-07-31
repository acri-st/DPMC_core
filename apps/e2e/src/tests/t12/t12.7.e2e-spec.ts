import { createCipheriv, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { CONFIG } from '../../constants/config';
import { keycloak } from '../../setup/services/keycloak';

// @plan T12.7 — Integration with external IAM system
// @covers EOCP-E12-05
//
// Description: This test verifies that authentication is delegated to an external IAM (Keycloak).
//   Full revoke/restore of a Keycloak user is not available in e2e; steps 2–3 are verified via
//   the session lifecycle: logout invalidates the session (simulates IAM revocation), a new
//   session restores access (simulates IAM restore). A disposable session is used so the shared
//   asAdminSession cache is not poisoned.
// Prerequisites: An external IAM provider (Keycloak) is configured.
// Steps:
//   1. Authenticate via IAM → Authentication succeeds
//   2. Invalidate session → Access is denied
//   3. Re-authenticate via IAM → Access is restored

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function encrypt(plaintext: string): Buffer {
  const key = Buffer.from(CONFIG.session.encryptionKey, 'base64');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

async function createDisposableAdminSession(): Promise<number> {
  const tokens = await keycloak.requestTokens('admin', 'admin');
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    // Fetch the admin user's id
    const userRes = await c.query<{ id: number }>(
      `SELECT u.id FROM "user" u
       JOIN "session" s ON s."userId" = u.id
       LIMIT 1`,
    );
    if (userRes.rows.length === 0) {
      // Fallback: look up by email
      const byEmail = await c.query<{ id: number }>(
        `SELECT id FROM "user" WHERE email LIKE 'admin%' LIMIT 1`,
      );
      if (byEmail.rows.length === 0) throw new Error('No admin user found in DB');
      const userId = byEmail.rows[0].id;
      const r = await c.query<{ id: number }>(
        `INSERT INTO "session" ("userId", "accessToken", "refreshToken",
           "accessTokenExpiresAt", "refreshTokenExpiresAt")
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          userId,
          encrypt(tokens.access_token),
          encrypt(tokens.refresh_token),
          new Date(Date.now() + tokens.expires_in * 1000),
          new Date(Date.now() + tokens.refresh_expires_in * 1000),
        ],
      );
      return r.rows[0].id;
    }
    const userId = userRes.rows[0].id;
    const r = await c.query<{ id: number }>(
      `INSERT INTO "session" ("userId", "accessToken", "refreshToken",
         "accessTokenExpiresAt", "refreshTokenExpiresAt")
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        userId,
        encrypt(tokens.access_token),
        encrypt(tokens.refresh_token),
        new Date(Date.now() + tokens.expires_in * 1000),
        new Date(Date.now() + tokens.refresh_expires_in * 1000),
      ],
    );
    return r.rows[0].id;
  } finally {
    await c.end();
  }
}

describe('T12.7 — Integration with external IAM system', () => {
  // @plan T12.7
  // @covers EOCP-E12-05
  it('Step 1 – Keycloak issues tokens for valid credentials', async () => {
    const tokens = await keycloak.requestTokens('admin', 'admin');
    expect(typeof tokens.access_token).toBe('string');
    expect(tokens.access_token.length).toBeGreaterThan(20);
    expect(typeof tokens.refresh_token).toBe('string');
  });

  // @plan T12.7
  // @covers EOCP-E12-05
  it('Step 2 – a Keycloak-backed session grants API access; logout revokes it', async () => {
    const sessionId = await createDisposableAdminSession();
    const cookie = `${CONFIG.session.cookieName}=${sessionId}`;

    await request(API).get('/auth/me').set('Cookie', cookie).expect(200);

    const logoutRes = await request(API).post('/auth/logout').set('Cookie', cookie);
    expect([200, 204]).toContain(logoutRes.status);

    // After logout the session is gone
    await request(API).get('/auth/me').set('Cookie', cookie).expect(401);
  });

  // @plan T12.7
  // @covers EOCP-E12-05
  it('Step 3 – a fresh session (IAM access restored) grants access again', async () => {
    // The shared admin session (cached) is independent of the disposed one above
    const { cookie } = await asAdminSession();
    await request(API).get('/auth/me').set('Cookie', cookie).expect(200);
  });
});
