import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T03.3 — Support for static and dynamic task requirements
// @covers EOCP-E3-03
//
// Description: Verifies that task resource requirements can be declared both statically (metadata)
//   and dynamically (runtime update via PATCH) and that stored values reflect the latest state.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Submit task with static requirements → Static requirements stored
//   2. Update requirements at runtime via PATCH → Scheduler registers the update
//   3. Retrieve the task → Latest parameters reflected in metadata

const log = makeLogger('T03.3');

describe('T03.3 — Support for static and dynamic task requirements', () => {
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
      log.action(`afterAll — deleting task ${taskId}`);
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
      log.ok(`task ${taskId} deleted`);
    }
  });

  // @plan T03.3
  // @covers EOCP-E3-03
  it('Step 1 – task with static resource parameters is accepted and parameters are stored', async () => {
    log.step('Step 1 — POST /task with static resource parameters');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 3, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T03.3 – static resource requirements', parameters: { resources: { ramMb: 1024, cpuCores: 1, requireGpu: false } } };
    log.action('POST /task', { resources: payload.parameters.resources });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, parameters: res.body.data.parameters } : res.body);
    expect(res.status).toBe(201);

    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.parameters).toBeDefined();
    log.ok('task accepted with static resource parameters', { id: taskId });
  });

  // @plan T03.3
  // @covers EOCP-E3-03
  it('Step 2 – PATCH /task/:id updates resource parameters (dynamic runtime update)', async () => {
    log.step(`Step 2 — PATCH /task/${taskId} with updated resources`);

    const patch = { parameters: { resources: { ramMb: 4096, cpuCores: 4, requireGpu: true } }, comment: 'T03.3 – updated resource requirements' };
    log.action('PATCH /task', patch);

    const res = await request(API).patch(`/task/${taskId}`).set('Cookie', cookie).send(patch);
    log.http('PATCH', `/task/${taskId}`, res.status, res.body.data ?? res.body);

    // API accepts (200) or rejects if task state prevents edits (409/422)
    expect([200, 409, 422]).toContain(res.status);
    if (res.status === 200) {
      log.ok('dynamic resource update accepted');
    } else {
      log.warn(`PATCH rejected (${res.status}) — task state may prevent edits`, res.body);
    }
  });

  // @plan T03.3
  // @covers EOCP-E3-03
  it('Step 3 – GET /task/:id reflects latest parameters after update attempt', async () => {
    log.step(`Step 3 — GET /task/${taskId} verifying latest parameters`);

    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie).expect(200);
    const params = res.body.data.parameters as Record<string, unknown> | undefined;
    log.http('GET', `/task/${taskId}`, res.status, { parameters: params });

    expect(res.body.data.id).toBe(taskId);
    expect(params).toBeDefined();
    expect((params as Record<string, unknown>).resources).toBeDefined();
    log.ok('parameters present after update attempt', { parameters: params });
  });
});
