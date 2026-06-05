import request from 'supertest';
import { API } from '../../support/auth';
import {
  asAdminSession,
  asExternalViewerSession,
  asInternalViewerSession,
  asOperatorSession,
} from '../../support/session';

// @plan T12.3 — Role-based access control (RBAC) enforcement.
// Verifies that GET endpoints are open to every authenticated role and that
// write endpoints (POST /task here) are restricted to admin/operator. The
// viewer roles must hit a 403, while admin/operator are stopped only by
// body validation (400). Section T12 — Security.

describe('T12.3 — Role-based access control (RBAC) enforcement', () => {
  describe('reads are allowed for every authenticated role', () => {
    const readers = [
      ['admin', asAdminSession],
      ['operator', asOperatorSession],
      ['internal-viewer', asInternalViewerSession],
      ['external-viewer', asExternalViewerSession],
    ] as const;

    // @plan T12.3
    // @covers EOCP-E12-02
    test.each(readers)('%s can list tasks', async (_label, session) => {
      const { cookie } = await session();
      await request(API).get('/task').set('Cookie', cookie).expect(200);
    });
  });

  describe('writes are restricted to admin/operator', () => {
    // @plan T12.3
    // @covers EOCP-E12-02
    test('admin: POST /task → 400 (passes RBAC, fails body validation)', async () => {
      const { cookie } = await asAdminSession();
      await request(API)
        .post('/task')
        .set('Cookie', cookie)
        .send({})
        .expect(400);
    });

    // @plan T12.3
    // @covers EOCP-E12-02
    test('operator: POST /task → 400 (passes RBAC, fails body validation)', async () => {
      const { cookie } = await asOperatorSession();
      await request(API)
        .post('/task')
        .set('Cookie', cookie)
        .send({})
        .expect(400);
    });

    // @plan T12.3
    // @covers EOCP-E12-02
    test('internal-viewer: POST /task → 403', async () => {
      const { cookie } = await asInternalViewerSession();
      await request(API)
        .post('/task')
        .set('Cookie', cookie)
        .send({})
        .expect(403);
    });

    // @plan T12.3
    // @covers EOCP-E12-02
    test('external-viewer: POST /task → 403', async () => {
      const { cookie } = await asExternalViewerSession();
      await request(API)
        .post('/task')
        .set('Cookie', cookie)
        .send({})
        .expect(403);
    });
  });
});
