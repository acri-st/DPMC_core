import { createCipheriv, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { CONFIG } from '../../constants/config';
import { keycloak } from '../../setup/services/keycloak';

// @plan T12.9 — Handling of expired credentials
// @covers EOCP-E12-01
//
// Description: This test verifies correct handling of expired or revoked credentials.
//   Full token expiry requires waiting for TTL; we simulate it by inserting a session with
//   past expiry timestamps directly into the DB, which is what SessionGuard checks.
// Prerequisites: Credential expiration policies are enforced.
// Steps:
//   1. Authenticate with expired session (past accessTokenExpiresAt + refreshTokenExpiresAt)
//      → Authentication fails / access is denied
//   2. Attempt API access with that expired session → Access is denied
//   3. Obtain a fresh session → Access is restored

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

async function insertExpiredSession(userId: number): Promise<number> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    const past = new Date(Date.now() - 60_000); // 1 minute in the past
    const r = await c.query<{ id: number }>(
      `INSERT INTO "session" ("userId", "accessToken", "refreshToken",
         "accessTokenExpiresAt", "refreshTokenExpiresAt")
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        userId,
        encrypt('expired-access-token'),
        encrypt('expired-refresh-token'),
        past,
        past,
      ],
    );
    return r.rows[0].id;
  } finally {
    await c.end();
  }
}

describe('T12.9 — Handling of expired credentials', () => {
  let adminUserId: number;

  beforeAll(async () => {
    const { userId } = await asAdminSession();
    adminUserId = userId;
  });

  // @plan T12.9
  // @covers EOCP-E12-01
  it('Step 1 – a session with past expiry timestamps is treated as expired', async () => {
    const expiredSessionId = await insertExpiredSession(adminUserId);
    const cookie = `${CONFIG.session.cookieName}=${expiredSessionId}`;
    // SessionGuard checks token expiry — expired session must be rejected
    const res = await request(API).get('/task').set('Cookie', cookie);
    expect([401, 403]).toContain(res.status);
  });

  // @plan T12.9
  // @covers EOCP-E12-01
  it('Step 2 – API access with expired session is denied on all protected endpoints', async () => {
    const expiredSessionId = await insertExpiredSession(adminUserId);
    const cookie = `${CONFIG.session.cookieName}=${expiredSessionId}`;

    const [r1, r2] = await Promise.all([
      request(API).get('/task').set('Cookie', cookie),
      request(API).get('/auth/me').set('Cookie', cookie),
    ]);
    expect([401, 403]).toContain(r1.status);
    expect([401, 403]).toContain(r2.status);
  });

  // @plan T12.9
  // @covers EOCP-E12-01
  it('Step 3 – a fresh valid session restores access', async () => {
    const { cookie } = await asAdminSession();
    await request(API).get('/task').set('Cookie', cookie).expect(200);
    await request(API).get('/auth/me').set('Cookie', cookie).expect(200);
  });
});
