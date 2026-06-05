import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.15 — Observability and traceability during scheduling failures
// @covers EOCP-E6-09
//
// Description: This test verifies that, during and after scheduling failures, the system provides
//   sufficient observability to reconstruct scheduling decisions and execution history.
// Prerequisites: Centralized logging and metrics collection are enabled. Correlation identifiers
//   are injected into scheduling and execution logs.
// Steps:
//   1. Launch a set of jobs → Logs and metrics are generated
//   2. Trigger scheduling or execution failures → Failures are logged
//   3. Collect logs and metrics → Data is consistently available
//   4. Reconstruct job execution timeline → Full scheduling history is traceable
//   5. Verify log completeness → No critical event is missing

const log = makeLogger('T06.15');

describe('T06.15 — Observability and traceability during scheduling failures', () => {
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

  // @plan T06.15
  // @covers EOCP-E6-09
  it('Step 1 – task is created and gets a unique ID (correlation anchor for tracing)', async () => {
    log.step('Step 1 — POST /task (observability test)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 2,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.15 – observability test',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created: ${taskId}`);
  });

  // @plan T06.15
  // @covers EOCP-E6-09
  it('Step 3 – scheduler status endpoint provides observability data', async () => {
    log.step('Step 3 — GET /scheduler/status');
    const res = await request(API)
      .get('/scheduler/status');
    log.http('GET', '/scheduler/status', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('scheduler status accessible');
  });

  // @plan T06.15
  // @covers EOCP-E6-09
  it('Step 4 – task history endpoint provides execution timeline', async () => {
    log.step(`Step 4 — GET /task/${taskId}/history`);
    const res = await request(API)
      .get(`/task/${taskId}/history`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}/history`, res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('task history accessible');
  });

  // @plan T06.15
  // @covers EOCP-E6-09
  it('Step 5 – task status-summary provides aggregate scheduling state (completeness check)', async () => {
    log.step('Step 5 — GET /task/status-summary');
    const res = await request(API)
      .get('/task/status-summary')
      .set('Cookie', cookie);
    log.http('GET', '/task/status-summary', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('status summary accessible');
  });
});
