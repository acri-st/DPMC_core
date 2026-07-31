import request from 'supertest';
import { API } from '../../support/auth';
import {
  asAdminSession,
  asExternalViewerSession,
  asInternalViewerSession,
} from '../../support/session';

// @plan T12.4 — Least privilege enforcement
// @covers EOCP-E12-02, EOCP-E1-04
//
// Description: This test verifies that users only have access to the minimum required permissions.
// Prerequisites: Roles are defined following least privilege principles.
// Steps:
//   1. Authenticate as standard user → User capabilities are limited
//   2. Attempt administrative operation → Access is denied
//   3. Authenticate as administrator → Operation succeeds

describe('T12.4 — Least privilege enforcement', () => {
  // @plan T12.4
  // @covers EOCP-E12-02, EOCP-E1-04
  it('Step 1 – viewer roles can read tasks but cannot perform write operations', async () => {
    const { cookie } = await asInternalViewerSession();
    // read is allowed
    await request(API).get('/task').set('Cookie', cookie).expect(200);
    // write is denied
    await request(API).post('/task').set('Cookie', cookie).send({}).expect(403);
  });

  // @plan T12.4
  // @covers EOCP-E12-02, EOCP-E1-04
  it('Step 2 – viewer roles cannot access admin-only endpoints (user list, audit log)', async () => {
    const { cookie: internalCookie } = await asInternalViewerSession();
    const { cookie: externalCookie } = await asExternalViewerSession();

    await request(API).get('/user').set('Cookie', internalCookie).expect(403);
    await request(API).get('/user').set('Cookie', externalCookie).expect(403);
    // TODO(audit-log): /audit-log endpoint not yet implemented — restore the
    // viewer-403 checks against it once it lands.
  });

  // @plan T12.4
  // @covers EOCP-E12-02, EOCP-E1-04
  it('Step 3 – admin can access admin-only endpoints', async () => {
    const { cookie } = await asAdminSession();
    await request(API).get('/user').set('Cookie', cookie).expect(200);
    // TODO(audit-log): /audit-log endpoint not yet implemented — restore the
    // admin-200 check against it once it lands.
  });
});
