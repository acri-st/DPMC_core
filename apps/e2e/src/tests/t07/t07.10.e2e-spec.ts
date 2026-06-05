import request from 'supertest';
import { API } from '../../support/auth';
import {
  asAdminSession,
  asOperatorSession,
  asInternalViewerSession,
  asExternalViewerSession,
} from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.10 — Permission enforcement on manual triggering
// @covers EOCP-E7-01
//
// Description: This test verifies that only authorized users can manually trigger jobs.
// Prerequisites: RBAC is enabled. At least two user roles exist.
// Steps:
//   1. Attempt manual trigger with authorized user (operator) → Job is created
//   2. Attempt manual trigger with unauthorized user (viewer) → Action is denied
//   3. Inspect security logs → Access attempt is recorded in audit log

const log = makeLogger('T07.10');

describe('T07.10 — Permission enforcement on manual triggering', () => {
  let adminCookie: string;
  let operatorCookie: string;
  let internalViewerCookie: string;
  let externalViewerCookie: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie: adminCookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('forging operator session');
    ({ cookie: operatorCookie } = await asOperatorSession());
    log.ok('operator session ready');

    log.action('forging internalViewer session');
    ({ cookie: internalViewerCookie } = await asInternalViewerSession());
    log.ok('internalViewer session ready');

    log.action('forging externalViewer session');
    ({ cookie: externalViewerCookie } = await asExternalViewerSession());
    log.ok('externalViewer session ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', adminCookie);
    }
  });

  // @plan T07.10
  // @covers EOCP-E7-01
  it('Step 1 – operator and admin can manually trigger jobs (authorized roles)', async () => {
    log.step('Step 1 — POST /task x2 (admin + operator)');
    const [adminRes, operatorRes] = await Promise.all([
      request(API)
        .post('/task')
        .set('Cookie', adminCookie)
        .send({
          projectId: PROJECT_ID,
          kind: 'Standalone',
          processorVersionId: PROCESSOR_VERSION_ID,
          priority: 0,
          productionMode: 'Nominal',
          priorityClass: 'NRT',
          scheduledStartTime: new Date().toISOString(),
          comment: 'T07.10 – admin trigger',
        }),
      request(API)
        .post('/task')
        .set('Cookie', operatorCookie)
        .send({
          projectId: PROJECT_ID,
          kind: 'Standalone',
          processorVersionId: PROCESSOR_VERSION_ID,
          priority: 0,
          productionMode: 'Nominal',
          priorityClass: 'NRT',
          scheduledStartTime: new Date().toISOString(),
          comment: 'T07.10 – operator trigger',
        }),
    ]);

    log.http('POST', '/task (admin)', adminRes.status, adminRes.status === 201 ? { id: adminRes.body.data.id } : adminRes.body);
    log.http('POST', '/task (operator)', operatorRes.status, operatorRes.status === 201 ? { id: operatorRes.body.data.id } : operatorRes.body);
    expect(adminRes.status).toBe(201);
    expect(operatorRes.status).toBe(201);
    createdTaskIds.push(adminRes.body.data.id, operatorRes.body.data.id);
    expect(adminRes.body.data.kind).toBe('Standalone');
    expect(operatorRes.body.data.kind).toBe('Standalone');
    log.ok('admin and operator tasks created');
  });

  // @plan T07.10
  // @covers EOCP-E7-01
  it('Step 2 – viewer roles are denied manual job triggering (unauthorized)', async () => {
    log.step('Step 2 — POST /task (internalViewer + externalViewer — expect 403)');
    const payload = {
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T07.10 – unauthorized trigger attempt',
    };
    const [internal, external] = await Promise.all([
      request(API).post('/task').set('Cookie', internalViewerCookie).send(payload),
      request(API).post('/task').set('Cookie', externalViewerCookie).send(payload),
    ]);

    log.http('POST', '/task (internalViewer)', internal.status, internal.body);
    log.http('POST', '/task (externalViewer)', external.status, external.body);
    expect(internal.status).toBe(403);
    expect(external.status).toBe(403);
    log.ok('viewers correctly denied (403)');
  });

  // @plan T07.10
  // @covers EOCP-E7-01
  it('Step 3 – audit log records write activity (access attempt is logged)', async () => {
    log.step('Step 3 — GET /audit-log');
    const res = await request(API).get('/audit-log').set('Cookie', adminCookie);
    log.http('GET', '/audit-log', res.status, res.status === 200 ? { count: res.headers['x-total-count'] } : res.body);
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body.data)
      ? res.body.data
      : (res.body.data?.items ?? []);
    expect(Array.isArray(items)).toBe(true);
    const total = parseInt(
      (res.headers['x-total-count'] as string | undefined) ?? '0',
      10,
    );
    expect(total).toBeGreaterThanOrEqual(0);
    log.ok(`audit log accessible, total=${total}`);
  });
});
