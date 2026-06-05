import request from 'supertest';
import { CONFIG } from '../../constants/config';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T12.2 — Token and session management.
// Verifies the SessionGuard contract: a forged or missing session id is
// rejected, a valid one is accepted. Section T12 — Security.

describe('T12.2 — Token and session management', () => {
  // @plan T12.2
  // @covers EOCP-E12-01
  it('rejects an unknown session id with 401', async () => {
    const fake = `${CONFIG.session.cookieName}=00000000-0000-0000-0000-deadbeef0000`;
    await request(API).get('/task').set('Cookie', fake).expect(401);
  });

  // @plan T12.2
  // @covers EOCP-E12-01
  it('rejects a malformed session cookie with 401', async () => {
    const malformed = `${CONFIG.session.cookieName}=not-a-valid-id`;
    await request(API).get('/task').set('Cookie', malformed).expect(401);
  });

  // @plan T12.2
  // @covers EOCP-E12-01
  it('accepts a valid forged session', async () => {
    const { cookie } = await asAdminSession();
    await request(API).get('/task').set('Cookie', cookie).expect(200);
  });
});
