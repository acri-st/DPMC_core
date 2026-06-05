import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.19 — Queue overflow and stress handling
// @covers EOCP-E6-04
//
// Description: This test verifies correct scheduler behavior when job queues grow beyond nominal
//   sizes.
// Prerequisites: Queue size limits and monitoring are enabled.
// Steps:
//   1. Submit a very large number of jobs → Jobs are accepted or throttled
//   2. Observe queue growth → No crash or corruption occurs
//   3. Monitor scheduler stability → Scheduler remains responsive

const log = makeLogger('T06.19');

describe('T06.19 — Queue overflow and stress handling', () => {
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

  // @plan T06.19
  // @covers EOCP-E6-04
  it('Step 1 – 50 tasks submitted sequentially are all accepted (queue accepts load)', async () => {
    log.step('Step 1 — POST /task x50 (sequential stress)');
    for (let i = 0; i < 50; i++) {
      const res = await request(API)
        .post('/task')
        .set('Cookie', cookie)
        .send({
          projectId: PROJECT_ID,
          kind: 'Standalone',
          processorVersionId: PROCESSOR_VERSION_ID,
          priority: i % 10,
          productionMode: 'Nominal',
          priorityClass: 'NRT',
          scheduledStartTime: new Date().toISOString(),
          comment: `T06.19 – overflow stress task ${i}`,
        });
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(50);
    log.ok('50 tasks created');
  }, 60000);

  // @plan T06.19
  // @covers EOCP-E6-04
  it('Step 2 – task list remains queryable after large submission (no corruption)', async () => {
    log.step('Step 2 — GET /task');
    const res = await request(API)
      .get('/task')
      .set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok('task list returned without corruption');
  });

  // @plan T06.19
  // @covers EOCP-E6-04
  it('Step 3 – scheduler status is still reachable after queue stress (stability check)', async () => {
    log.step('Step 3 — GET /scheduler/status');
    const res = await request(API)
      .get('/scheduler/status');
    log.http('GET', '/scheduler/status', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('scheduler stable after stress');
  });
});
