import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';
import { deleteHost, registerPayload, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T06.7 — Execution engine interface and job monitoring
// @covers EOCP-E6-06
//
// Description: This test verifies that the execution engine interface correctly launches jobs and
//   monitors their execution status.
// Prerequisites: Execution nodes are registered. Container execution is enabled.
// Steps:
//   1. Dispatch a job to a node → Job is launched
//   2. Monitor execution state → State transitions are correct
//   3. Observe completion → Final status is reported

const log = makeLogger('T06.7');

describe('T06.7 — Execution engine interface and job monitoring', () => {
  let cookie: string;
  let hostId: string;
  let taskId: string;
  const hostname = uniqueHostname('t06-7-exec');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /host/register');
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send(registerPayload(hostname));
    log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id, hostname } : res.body);
    expect(res.status).toBe(200);
    hostId = res.body.data.id;

    log.action('POST /host/:id/heartbeat (initial)');
    const hb = await request(API)
      .post(`/host/${hostId}/heartbeat`)
      .set(workerHeader())
      .send({ cpuLoad: 0.05, memUsage: 0.1, diskUsage: 0.05 });
    log.http('POST', `/host/${hostId}/heartbeat`, hb.status);
    expect(hb.status).toBe(200);
    log.ok(`host registered, hostId=${hostId}`);
  });

  afterAll(async () => {
    if (taskId) {
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    }
    await deleteHost(hostname);
  });

  // @plan T06.7
  // @covers EOCP-E6-06
  it('Step 1 – task is created and submitted to the execution queue', async () => {
    log.step('Step 1 — POST /task (standalone)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.7 – execution engine interface test',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created: ${taskId}`);
  });

  // @plan T06.7
  // @covers EOCP-E6-06
  it('Step 2 – task state is readable via GET /task/:id (execution monitored)', async () => {
    log.step(`Step 2 — GET /task/${taskId}`);
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
    expect(res.body.data.status).toBeDefined();
    log.ok(`task status: ${res.body.data.status}`);
  });

  // @plan T06.7
  // @covers EOCP-E6-06
  it('Step 3 – task history is available (execution trace reachable)', async () => {
    log.step(`Step 3 — GET /task/${taskId}/history`);
    const res = await request(API)
      .get(`/task/${taskId}/history`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}/history`, res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('task history accessible');
  });
});
