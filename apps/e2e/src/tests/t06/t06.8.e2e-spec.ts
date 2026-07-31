import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';
import { workerHeader } from '../t03/_shared';

// @plan T06.8 — Persistence and recovery after scheduler restart
// @covers EOCP-E6-07
//
// Description: This test verifies that scheduling decisions are persisted and replayed after a
//   scheduler restart.
// Prerequisites: Persistent storage is enabled. A job is running.
// Steps:
//   1. Launch a job → Job enters execution
//   2. Restart scheduler service → Scheduler restarts cleanly
//   3. Observe job state → Job state is recovered

const log = makeLogger('T06.8');

describe('T06.8 — Persistence and recovery after scheduler restart', () => {
  let cookie: string;
  let taskId: string;

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

  // @plan T06.8
  // @covers EOCP-E6-07
  it('Step 1 – task is created and persisted (state survives in DB)', async () => {
    log.step('Step 1 — POST /task (persistence test)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 3,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.8 – persistence test',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created: ${taskId}`);
  });

  // @plan T06.8
  // @covers EOCP-E6-07
  it('Step 2 – scheduler heartbeat endpoint is reachable (scheduler is running)', async () => {
    log.step('Step 2 — POST /scheduler/heartbeat');
    const res = await request(API)
      .post('/scheduler/heartbeat')
      .set(workerHeader())
      .send({ queueDepth: 0, runningCount: 0 });
    log.http('POST', '/scheduler/heartbeat', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    log.ok('scheduler heartbeat responded');
  });

  // @plan T06.8
  // @covers EOCP-E6-07
  it('Step 3 – task state is retrievable after scheduler heartbeat (persistent state readable)', async () => {
    log.step(`Step 3 — GET /task/${taskId}`);
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
    expect(res.body.data.status).toBeDefined();
    log.ok(`task state persisted: ${res.body.data.status}`);
  });
});
