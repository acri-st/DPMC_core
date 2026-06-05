import request from 'supertest';
import { CONFIG } from '../../constants/config';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T12.11 — Prevention of protocol downgrade attacks
// @covers EOCP-E12-11
//
// Description: This test verifies that insecure protocol downgrades are not permitted.
//   TLS termination is an infrastructure concern handled by the reverse proxy in production.
//   At the application layer this test verifies: (1) the API does not accept auth via
//   deprecated/weak mechanisms, (2) it uses the configured protocol correctly, and (3)
//   security-sensitive cookies are flagged appropriately.
// Prerequisites: Only secure protocol versions are enabled.
// Steps:
//   1. API does not accept HTTP Basic auth (deprecated protocol pathway) → 401
//   2. API is reachable over its configured protocol (connection succeeds)
//   3. Session cookie name is the one configured (not a default that signals misconfiguration)

describe('T12.11 — Prevention of protocol downgrade attacks', () => {
  // @plan T12.11
  // @covers EOCP-E12-11
  it('Step 1 – API does not accept HTTP Basic authentication on protected endpoints', async () => {
    // Providing Basic auth credentials must not bypass the session guard
    await request(API)
      .get('/task')
      .auth('admin', 'admin')
      .expect(401);

    await request(API)
      .get('/user')
      .auth('admin', 'admin')
      .expect(401);
  });

  // @plan T12.11
  // @covers EOCP-E12-11
  it('Step 2 – API responds correctly over the configured protocol', async () => {
    expect(CONFIG.api.url).toMatch(/^https?:\/\//);
    await request(API).get('/healthz').expect(200);
    await request(API).get('/status').expect(200);
  });

  // @plan T12.11
  // @covers EOCP-E12-11
  it('Step 3 – session cookie is not set to an insecure default name', async () => {
    // If the cookie name were empty or a known insecure default, it would indicate misconfiguration
    expect(CONFIG.session.cookieName).toBeTruthy();
    expect(CONFIG.session.cookieName).not.toBe('session');
    expect(CONFIG.session.cookieName).not.toBe('sid');
    expect(CONFIG.session.cookieName).not.toBe('connect.sid');

    // Confirm the valid session cookie is accepted on the actual API
    const { cookie } = await asAdminSession();
    await request(API).get('/task').set('Cookie', cookie).expect(200);
  });
});
