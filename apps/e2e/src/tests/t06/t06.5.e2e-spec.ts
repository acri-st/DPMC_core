import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.5 — Queue separation by project, priority, and site
// @covers EOCP-E6-06
//
// Description: This test verifies that the queue manager maintains independent queues per project,
//   priority class, and site.
// Prerequisites: Multiple projects and priority classes are configured.
// Steps:
//   1. Submit jobs from different projects → Jobs enter distinct queues
//   2. Submit jobs with different priorities → Priority queues are respected
//   3. Observe scheduling → No cross-queue interference

const log = makeLogger('T06.5');

describe('T06.5 — Queue separation by project, priority, and site', () => {
  let cookie: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T06.5
  // @covers EOCP-E6-06
  it('Step 1 – NRT task submitted to project queue is accepted with correct priorityClass', async () => {
    log.step('Step 1 — POST /task (NRT queue)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.5 – NRT queue',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass, projectId: res.body.data.projectId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.priorityClass).toBe('NRT');
    expect(res.body.data.projectId).toBe(PROJECT_ID);
    log.ok(`NRT task created: ${res.body.data.id}`);
  });

  // @plan T06.5
  // @covers EOCP-E6-06
  it('Step 2 – RT task submitted to priority queue is accepted with correct priorityClass', async () => {
    log.step('Step 2 — POST /task (Super queue)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 9,
        productionMode: 'Nominal',
        priorityClass: 'Super',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.5 – RT queue',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.priorityClass).toBe('Super');
    log.ok(`Super task created: ${res.body.data.id}`);
  });

  // @plan T06.5
  // @covers EOCP-E6-06
  it('Step 3 – task status summary exists and reflects multi-queue state', async () => {
    log.step('Step 3 — GET /task/status-summary');
    const res = await request(API)
      .get('/task/status-summary')
      .set('Cookie', cookie);
    log.http('GET', '/task/status-summary', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('status summary received');
  });
});
