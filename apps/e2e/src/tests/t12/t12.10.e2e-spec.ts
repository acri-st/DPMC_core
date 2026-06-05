import request from 'supertest';
import { API } from '../../support/auth';
import {
  asAdminSession,
  asInternalViewerSession,
  asExternalViewerSession,
} from '../../support/session';

// @plan T12.10 — Protection against privilege escalation attempts
// @covers EOCP-E12-10
//
// Description: This test verifies that attempts to escalate privileges are detected and blocked.
// Prerequisites: Authorization checks are enforced consistently.
// Steps:
//   1. Attempt role manipulation via API → Request is rejected
//   2. Attempt access to restricted endpoint with lower-privilege role → Access is denied
//   3. Confirm admin access to the same endpoint is permitted

describe('T12.10 — Protection against privilege escalation attempts', () => {
  // @plan T12.10
  // @covers EOCP-E12-10
  it('Step 1 – viewer cannot escalate to write access by supplying a role header', async () => {
    const { cookie } = await asInternalViewerSession();
    // Attempting to inject a role via a header must not bypass RBAC
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .set('X-Role', 'admin')
      .set('X-User-Role', 'admin')
      .send({})
      .expect(403);
    expect(res.status).toBe(403);
  });

  // @plan T12.10
  // @covers EOCP-E12-10
  it('Step 2 – viewer roles are consistently blocked from all write and admin-only endpoints', async () => {
    const { cookie: internalCookie } = await asInternalViewerSession();
    const { cookie: externalCookie } = await asExternalViewerSession();

    const writeAttempts = [
      request(API).post('/task').set('Cookie', internalCookie).send({}),
      request(API).post('/task').set('Cookie', externalCookie).send({}),
      request(API).get('/user').set('Cookie', internalCookie),
      request(API).get('/audit-log').set('Cookie', externalCookie),
    ];

    const results = await Promise.all(writeAttempts);
    for (const res of results) {
      expect(res.status).toBe(403);
    }
  });

  // @plan T12.10
  // @covers EOCP-E12-10
  it('Step 3 – admin role consistently has access to the same endpoints', async () => {
    const { cookie } = await asAdminSession();
    await request(API).get('/user').set('Cookie', cookie).expect(200);
    await request(API).get('/audit-log').set('Cookie', cookie).expect(200);
    // POST /task with empty body passes RBAC and fails on body validation (400), not auth
    await request(API).post('/task').set('Cookie', cookie).send({}).expect(400);
  });
});
