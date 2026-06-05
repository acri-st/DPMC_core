import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession, asOperatorSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.9 — Concurrent triggering and conflict resolution
// @covers EOCP-E7-06
//
// Description: This test verifies the system behavior when multiple triggers occur simultaneously.
// Prerequisites: Multiple trigger types are active. Concurrency handling is implemented.
// Steps:
//   1. Trigger jobs via multiple mechanisms simultaneously → Triggers are received
//   2. Observe job creation → Jobs are created consistently with distinct IDs
//   3. Verify system stability → All jobs are independently accessible

const log = makeLogger('T07.9');

describe('T07.9 — Concurrent triggering and conflict resolution', () => {
  let adminCookie: string;
  let operatorCookie: string;
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
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', adminCookie);
    }
  });

  // @plan T07.9
  // @covers EOCP-E7-06
  it('Step 1 – concurrent POST /task requests from different sessions are all accepted', async () => {
    log.step('Step 1 — POST /task x4 (concurrent, 2 admin + 2 operator)');
    const taskPayload = (comment: string) => ({
      projectId: PROJECT_ID,
      kind: 'Standalone' as const,
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal' as const,
      priorityClass: 'NRT' as const,
      scheduledStartTime: new Date().toISOString(),
      comment,
    });

    const results = await Promise.all([
      request(API).post('/task').set('Cookie', adminCookie).send(taskPayload('T07.9 – admin-1')),
      request(API).post('/task').set('Cookie', adminCookie).send(taskPayload('T07.9 – admin-2')),
      request(API).post('/task').set('Cookie', operatorCookie).send(taskPayload('T07.9 – operator-1')),
      request(API).post('/task').set('Cookie', operatorCookie).send(taskPayload('T07.9 – operator-2')),
    ]);

    for (const res of results) {
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    log.ok(`4 concurrent tasks created: ${createdTaskIds.join(', ')}`);
  });

  // @plan T07.9
  // @covers EOCP-E7-06
  it('Step 2 – all concurrently created jobs have distinct IDs', async () => {
    log.step('Step 2 — verify distinct IDs');
    expect(createdTaskIds.length).toBe(4);
    expect(new Set(createdTaskIds).size).toBe(4);
    log.ok('all 4 IDs are distinct');
  });

  // @plan T07.9
  // @covers EOCP-E7-06
  it('Step 3 – all jobs are independently accessible and system is stable', async () => {
    log.step('Step 3 — GET /task/:id x4 + health checks');
    const fetches = await Promise.all(
      createdTaskIds.map((id) =>
        request(API).get(`/task/${id}`).set('Cookie', adminCookie),
      ),
    );
    for (const res of fetches) {
      log.http('GET', `/task/:id`, res.status, res.status === 200 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBeDefined();
    }

    log.action('GET /status');
    const status = await request(API).get('/status');
    log.http('GET', '/status', status.status);
    expect(status.status).toBe(200);

    log.action('GET /healthz');
    const healthz = await request(API).get('/healthz');
    log.http('GET', '/healthz', healthz.status);
    expect(healthz.status).toBe(200);
    log.ok('system stable after concurrent triggers');
  });
});
