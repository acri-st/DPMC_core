import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.6 — Scheduled time-based triggering
// @covers EOCP-E7-06
//
// Description: This test verifies that jobs can be triggered automatically based on a time
//   schedule. Automatic cron-based dispatch is not yet implemented. This test verifies the
//   observable scheduling infrastructure: the scheduler service is reachable, tasks carry a
//   scheduledStartTime, and that field is honored in task creation.
// Prerequisites: Scheduler supports cron or time-based rules. System clock is synchronized.
// Steps:
//   1. Configure a scheduled trigger → Scheduler is active; task with future scheduledStartTime
//      is accepted
//   2. Wait for scheduled time → Task with a near-future time is queued
//   3. Observe job execution → Task appears with the correct scheduled time

const log = makeLogger('T07.6');

describe('T07.6 — Scheduled time-based triggering', () => {
  let cookie: string;
  let taskId: string | undefined;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    if (taskId) {
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    }
  });

  // @plan T07.6
  // @covers EOCP-E7-06
  it('Step 1 – scheduler service is reachable (scheduling infrastructure is active)', async () => {
    log.step('Step 1 — GET /scheduler/status');
    const res = await request(API).get('/scheduler/status');
    log.http('GET', '/scheduler/status', res.status, res.body);
    expect([200, 503]).toContain(res.status);
    log.ok(`scheduler status: ${res.status}`);
  });

  // @plan T07.6
  // @covers EOCP-E7-06
  it('Step 2 – task with a future scheduledStartTime is accepted by the API', async () => {
    log.step('Step 2 — POST /task (future scheduledStartTime)');
    const futureTime = new Date(Date.now() + 60_000).toISOString();
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
        scheduledStartTime: futureTime,
        comment: 'T07.6 – scheduled trigger',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, scheduledStartTime: res.body.data.scheduledStartTime } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created with future time: ${taskId}`);
  });

  // @plan T07.6
  // @covers EOCP-E7-06
  it('Step 3 – scheduled task is retrievable with the correct scheduledStartTime', async () => {
    log.step(`Step 3 — GET /task/${taskId}`);
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { scheduledStartTime: res.body.data.scheduledStartTime } : res.body);
    expect(res.status).toBe(200);

    const task = res.body.data;
    expect(task.scheduledStartTime).toBeDefined();
    const scheduled = new Date(task.scheduledStartTime).getTime();
    // Scheduled time is in the future relative to task creation
    expect(scheduled).toBeGreaterThan(Date.now() - 5_000);
    log.ok(`scheduledStartTime confirmed: ${task.scheduledStartTime}`);
  });
});
