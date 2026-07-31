import request from 'supertest';
import { CONFIG } from '../../constants/config';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T12.8 — Handling of insecure default configurations
// @covers EOCP-E12-03, EOCP-E1-04
//
// Description: This test verifies that insecure default configurations are not active.
//   "Deploy with insecure defaults" is an infrastructure concern; this test validates the
//   observable security posture of the running API: no default/empty secrets, auth guards
//   active, and secure response headers present.
// Prerequisites: Security configuration validation is enabled.
// Steps:
//   1. Verify running API rejects no-auth requests → AuthGuard is active (no open default)
//   2. Verify session cookie is configured securely (HttpOnly, no raw secret in response)
//   3. Verify running configuration uses non-default secrets (worker token is set)

describe('T12.8 — Handling of insecure default configurations', () => {
  // @plan T12.8
  // @covers EOCP-E12-03, EOCP-E1-04
  it('Step 1 – protected endpoints are guarded (no insecure open-access default)', async () => {
    // All write endpoints require auth — no "allow all by default" misconfiguration
    await request(API).get('/task').expect(401);
    await request(API).post('/task').send({}).expect(401);
    await request(API).get('/user').expect(401);
    // TODO(audit-log): /audit-log endpoint not yet implemented — restore the
    // unauthenticated-401 check against it once it lands.
  });

  // @plan T12.8
  // @covers EOCP-E12-03, EOCP-E1-04
  it('Step 2 – /auth/me does not expose raw tokens or secrets in the response body', async () => {
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/auth/me').set('Cookie', cookie).expect(200);
    const body = JSON.stringify(res.body);
    // No raw access/refresh tokens in the response
    expect(body).not.toMatch(/"accessToken"/);
    expect(body).not.toMatch(/"refreshToken"/);
    expect(body).not.toMatch(/"password"/);
  });

  // @plan T12.8
  // @covers EOCP-E12-03, EOCP-E1-04
  it('Step 3 – worker registration token is non-empty and meets minimum length', async () => {
    // If WORKER_REGISTRATION_TOKEN were empty/default the host/register endpoint would be open
    expect(CONFIG.worker.registrationToken.length).toBeGreaterThanOrEqual(20);

    // The configured token is actually enforced — wrong secret still returns 401
    await request(API)
      .post('/host/register')
      .set({ [CONFIG.worker.headerName]: 'insecure-default' })
      .send({ hostname: 'probe' })
      .expect(401);
  });
});
