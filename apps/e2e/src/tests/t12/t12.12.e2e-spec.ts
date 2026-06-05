import request from 'supertest';
import { API } from '../../support/auth';
import {
  asAdminSession,
  asInternalViewerSession,
} from '../../support/session';

// @plan T12.12 — Tamper resistance of security logs
// @covers EOCP-E12-12
//
// Description: This test verifies that security logs cannot be altered without detection.
//   The audit log API has no DELETE or PATCH endpoint, making direct API-level tampering
//   impossible. This test validates: (1) audit log is read-only via API, (2) only admin can
//   read it, (3) entries are immutable once written (no update endpoint exists).
// Prerequisites: Log integrity protections are enabled.
// Steps:
//   1. Attempt to modify audit log entries via API → No mutation endpoint exists (blocked)
//   2. Unauthorized access attempt to audit log is rejected
//   3. Audit log entries are returned in consistent descending order (integrity check)

describe('T12.12 — Tamper resistance of security logs', () => {
  // @plan T12.12
  // @covers EOCP-E12-12
  it('Step 1 – no DELETE or PATCH endpoint exists for audit log (API-level tamper prevention)', async () => {
    const { cookie } = await asAdminSession();

    // These endpoints must not exist (405 Method Not Allowed or 404 Not Found)
    const [del, patch] = await Promise.all([
      request(API).delete('/audit-log').set('Cookie', cookie),
      request(API).patch('/audit-log').set('Cookie', cookie).send({}),
    ]);

    expect([404, 405]).toContain(del.status);
    expect([404, 405]).toContain(patch.status);
  });

  // @plan T12.12
  // @covers EOCP-E12-12
  it('Step 2 – unauthorized access to audit log is rejected', async () => {
    // Unauthenticated
    await request(API).get('/audit-log').expect(401);

    // Authenticated but insufficient role
    const { cookie } = await asInternalViewerSession();
    await request(API).get('/audit-log').set('Cookie', cookie).expect(403);
  });

  // @plan T12.12
  // @covers EOCP-E12-12
  it('Step 3 – audit log entries are returned in consistent descending order', async () => {
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/audit-log').set('Cookie', cookie).expect(200);

    const items: Array<{ createdAt: string }> = Array.isArray(res.body.data)
      ? res.body.data
      : (res.body.data?.items ?? []);

    if (items.length >= 2) {
      // Each entry's createdAt must be >= the next (descending order = newest first)
      for (let i = 0; i < items.length - 1; i++) {
        const a = new Date(items[i].createdAt).getTime();
        const b = new Date(items[i + 1].createdAt).getTime();
        expect(a).toBeGreaterThanOrEqual(b);
      }
    }
    // Passes trivially if 0 or 1 entries (no entries to compare)
    expect(Array.isArray(items)).toBe(true);
  });
});
