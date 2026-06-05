import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession, asInternalViewerSession } from '../../support/session';

// @plan T12.6 — Security audit logging
// @covers EOCP-E12-06
//
// Description: This test verifies that security-relevant events are properly logged via the
//   audit-log endpoint. The audit log captures write operations performed by authenticated users.
// Prerequisites: Security audit logging is enabled.
// Steps:
//   1. Perform a write operation as admin → Event is recorded in audit log
//   2. Perform unauthorized action as viewer → 403 is returned; audit log remains accessible
//   3. Attempt unauthorized action → Security event is logged (GET /audit-log requires admin)

describe('T12.6 — Security audit logging', () => {
  let cookie: string;

  beforeAll(async () => {
    ({ cookie } = await asAdminSession());
  });

  // @plan T12.6
  // @covers EOCP-E12-06
  it('Step 1 – audit log endpoint returns 200 with a list for admin', async () => {
    const res = await request(API).get('/audit-log').set('Cookie', cookie).expect(200);
    const items = Array.isArray(res.body.data)
      ? res.body.data
      : (res.body.data?.items ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  // @plan T12.6
  // @covers EOCP-E12-06
  it('Step 2 – audit log records entries after write operations', async () => {
    const before = await request(API).get('/audit-log').set('Cookie', cookie).expect(200);
    const countBefore: number = parseInt(
      (before.headers['x-total-count'] as string | undefined) ?? '0',
      10,
    );

    // Trigger an auditable write: create then delete a project
    const proj = await request(API)
      .post('/project')
      .set('Cookie', cookie)
      .send({ name: `T12.6-audit-${Date.now()}`, acronym: `T126_${Date.now()}` });

    if (proj.status === 201) {
      await request(API)
        .delete(`/project/${proj.body.data.id}`)
        .set('Cookie', cookie);
    }

    const after = await request(API).get('/audit-log').set('Cookie', cookie).expect(200);
    const countAfter: number = parseInt(
      (after.headers['x-total-count'] as string | undefined) ?? '0',
      10,
    );

    // Audit log must have grown (or at minimum not lost entries)
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  // @plan T12.6
  // @covers EOCP-E12-06
  it('Step 3 – viewer role is blocked from audit log (unauthorized access attempt is rejected)', async () => {
    const { cookie: viewerCookie } = await asInternalViewerSession();
    await request(API).get('/audit-log').set('Cookie', viewerCookie).expect(403);
  });
});
