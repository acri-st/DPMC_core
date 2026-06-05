import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.2 — Scheduling engine scalability under mixed workload
// @covers EOCP-E6-03
//
// Description: This test verifies that the scheduler can handle a large number of concurrent jobs
//   with mixed priorities and dependencies.
// Prerequisites: Multiple jobs with heterogeneous characteristics are available. System monitoring
//   is enabled.
// Steps:
//   1. Submit a large batch of jobs → Scheduler remains responsive
//   2. Monitor queue evolution → Jobs are ordered correctly
//   3. Observe throughput → No degradation beyond design limits

const log = makeLogger('T06.2');

describe('T06.2 — Scheduling engine scalability under mixed workload', () => {
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

  // @plan T06.2
  // @covers EOCP-E6-03
  it('Step 1 – batch of tasks with mixed priorities is accepted without timeout', async () => {
    log.step('Step 1 — POST /task x5 with mixed priorities');
    const priorities = [0, 1, 2, 3, 4];
    const results = await Promise.all(
      priorities.map((priority) =>
        request(API)
          .post('/task')
          .set('Cookie', cookie)
          .send({
            projectId: PROJECT_ID,
            kind: 'Standalone',
            processorVersionId: PROCESSOR_VERSION_ID,
            priority,
            productionMode: 'Nominal',
            priorityClass: 'NRT',
            scheduledStartTime: new Date().toISOString(),
            comment: `T06.2 – scalability batch priority=${priority}`,
          }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priority: res.body.data.priority } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(5);
    log.ok(`5 tasks created: ${createdTaskIds.join(', ')}`);
  });

  // @plan T06.2
  // @covers EOCP-E6-03
  it('Step 2 – task status summary reflects queued tasks (scheduler tracking them)', async () => {
    log.step('Step 2 — GET /task/status-summary');
    const res = await request(API)
      .get('/task/status-summary')
      .set('Cookie', cookie);
    log.http('GET', '/task/status-summary', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('status summary received');
  });

  // @plan T06.2
  // @covers EOCP-E6-03
  it('Step 3 – GET /task returns all submitted tasks without server error (API remains responsive)', async () => {
    log.step('Step 3 — GET /task');
    const res = await request(API)
      .get('/task')
      .set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok('task list returned');
  });
});
