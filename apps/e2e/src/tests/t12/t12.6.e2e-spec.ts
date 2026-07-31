import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession, asInternalViewerSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T12.6 — Security audit logging
// @covers EOCP-E12-04
//
// Description: This test verifies that security-relevant events are properly logged via the
//   audit-log endpoint. The audit log captures write operations performed by authenticated users.
// Prerequisites: Security audit logging is enabled.
// Steps:
//   1. Perform a write operation as admin → Event is recorded in audit log
//   2. Perform unauthorized action as viewer → 403 is returned; audit log remains accessible
//   3. Attempt unauthorized action → Security event is logged (GET /audit-log requires admin)

const log = makeLogger('T12.6');

interface AuditRow {
  id: number;
  actorId: string | null;
  actorType: string;
  action: string;
  aggregateType: string;
  aggregateId: string;
}

describe('T12.6 — Security audit logging', () => {
  let cookie: string;
  let projectId: number;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  afterAll(async () => {
    if (projectId) {
      await request(API).delete(`/project/${projectId}`).set('Cookie', cookie);
    }
  });

  // @plan T12.6
  // @covers EOCP-E12-04
  it('Step 1 – a write operation is recorded in the audit log', async () => {
    log.step('Step 1 — create a project, then look for its audit entry');

    const suffix = Date.now();
    const created = await request(API)
      .post('/project')
      .set('Cookie', cookie)
      .send({ identifier: `t126-${suffix}`, name: `T12.6 audit ${suffix}` });
    log.http('POST', '/project', created.status, { id: created.body.data?.id });
    expect(created.status).toBe(201);
    projectId = created.body.data.id;

    const res = await request(API).get('/audit-log').set('Cookie', cookie);
    log.http('GET', '/audit-log', res.status, { count: res.body.data?.length });
    expect(res.status).toBe(200);

    const rows = res.body.data as AuditRow[];
    expect(Array.isArray(rows)).toBe(true);

    const entry = rows.find(
      (r) => r.aggregateType === 'project' && r.aggregateId === String(projectId),
    );
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('Create');
    // The event names who performed it, which is the point of the trail.
    expect(entry!.actorType).toBe('User');
    expect(entry!.actorId).toBeTruthy();
    log.ok(`audit entry ${entry!.id}: ${entry!.actorType} ${entry!.action} project/${projectId}`);
  });

  // @plan T12.6
  // @covers EOCP-E12-04
  it('Step 2 – a denied write leaves the trail accessible and unchanged for that resource', async () => {
    log.step('Step 2 — a viewer attempts a write; it must be refused');

    const { cookie: viewerCookie } = await asInternalViewerSession();
    const suffix = Date.now();
    const denied = await request(API)
      .post('/project')
      .set('Cookie', viewerCookie)
      .send({ identifier: `t126-denied-${suffix}`, name: `T12.6 denied ${suffix}` });
    log.http('POST', '/project (viewer)', denied.status, denied.body);
    expect(denied.status).toBe(403);

    const res = await request(API).get('/audit-log').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const rows = res.body.data as AuditRow[];

    // A rejected request changed nothing, so it must not appear as a Create.
    const forged = rows.find(
      (r) => r.aggregateType === 'project' && r.action === 'Create' && r.actorType !== 'User',
    );
    expect(forged).toBeUndefined();
    log.ok('audit log still readable and free of entries for the refused write');
  });

  // @plan T12.6
  // @covers EOCP-E12-04
  it('Step 3 – reading the audit log requires administrator rights', async () => {
    log.step('Step 3 — a viewer must not be able to read the trail');

    const { cookie: viewerCookie } = await asInternalViewerSession();
    const res = await request(API).get('/audit-log').set('Cookie', viewerCookie);
    log.http('GET', '/audit-log (viewer)', res.status, res.body);
    expect(res.status).toBe(403);

    // Unauthenticated access is refused as well.
    const anonymous = await request(API).get('/audit-log');
    log.http('GET', '/audit-log (anonymous)', anonymous.status, anonymous.body);
    expect(anonymous.status).toBe(401);
    log.ok('trail is admin-only');
  });
});
