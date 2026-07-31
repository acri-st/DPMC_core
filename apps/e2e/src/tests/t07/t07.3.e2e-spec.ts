import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.3 — Triggering jobs via REST API
// @covers EOCP-E7-03
//
// Description: This test verifies that external systems can trigger job execution using REST APIs.
// Prerequisites: REST API access is enabled. Valid authentication credentials are available.
// Steps:
//   1. Send a job creation request via API → Request is accepted
//   2. Observe job creation → Job appears in the system
//   3. Monitor execution → Job is scheduled and accessible

const log = makeLogger('T07.3');

describe('T07.3 — Triggering jobs via REST API', () => {
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

  // @plan T07.3
  // @covers EOCP-E7-03
  it('Step 1 – POST /task via REST API is accepted with 201', async () => {
    log.step('Step 1 — POST /task (REST API trigger)');
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
        comment: 'T07.3 – REST API trigger',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(typeof res.body.data.id).toBe('number');
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T07.3
  // @covers EOCP-E7-03
  it('Step 2 – triggered job appears in the task list', async () => {
    log.step('Step 2 — GET /task (task list)');
    const list = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', list.status);
    expect(list.status).toBe(200);
    const items = Array.isArray(list.body.data)
      ? list.body.data
      : (list.body.data?.items ?? []);
    const listedIds = new Set(items.map((t: { id: string }) => t.id));
    expect(listedIds.has(createdTaskIds[0])).toBe(true);
    log.ok('triggered task found in task list');
  });

  // @plan T07.3
  // @covers EOCP-E7-03
  it('Step 3 – triggered job is retrievable and has a scheduled start time', async () => {
    log.step(`Step 3 — GET /task/${createdTaskIds[0]}`);
    const res = await request(API)
      .get(`/task/${createdTaskIds[0]}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${createdTaskIds[0]}`, res.status, res.status === 200 ? { scheduledStartTime: res.body.data.scheduledStartTime, projectId: res.body.data.projectId } : res.body);
    expect(res.status).toBe(200);

    const task = res.body.data;
    expect(task.scheduledStartTime).toBeDefined();
    expect(task.projectId).toBe(PROJECT_ID);
    expect(task.comment).toContain('T07.3');
    log.ok('task fields confirmed');
  });
});
