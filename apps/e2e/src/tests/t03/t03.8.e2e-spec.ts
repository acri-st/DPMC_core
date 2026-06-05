import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T03.8 — Rejection of impossible resource declarations
// @covers EOCP-E3-02
//
// Description: Verifies that tasks declaring impossible resource requirements are either rejected
//   at submission or remain pending without crashing the system. The API uses lazy scheduling so
//   the task may be accepted — what matters is system stability.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T03.8');

describe('T03.8 — Rejection of impossible resource declarations', () => {
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
      log.action(`afterAll — deleting task ${taskId}`);
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
      log.ok(`task ${taskId} deleted`);
    }
  });

  // @plan T03.8
  // @covers EOCP-E3-02
  it('Step 1 – task with extreme resource requirements is handled without server error', async () => {
    log.step('Step 1 — POST /task with impossible resources (99TB RAM, 9999 cores, GPU)');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 1, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T03.8 – impossible resource requirement', parameters: { resources: { ramMb: 99_999_999, cpuCores: 9999, requireGpu: true } } };
    log.action('POST /task', { resources: payload.parameters.resources });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (impossible resources)', res.status, res.status < 500 ? (res.status === 201 ? { id: res.body.data.id } : res.body) : res.body);

    // Never 5xx — accepted (201, lazy) or rejected (4xx)
    expect(res.status).not.toBeGreaterThanOrEqual(500);
    if (res.status === 201) {
      taskId = res.body.data.id as string;
      log.warn('extreme requirements accepted (lazy validation) — task queued but will not dispatch', { id: taskId });
    } else {
      log.ok(`extreme requirements rejected at submission (${res.status}) — no crash`);
    }
  });

  // @plan T03.8
  // @covers EOCP-E3-02
  it('Step 2 – system remains stable: task list is still accessible', async () => {
    log.step('Step 2 — GET /task (stability check after extreme submission)');

    const res = await request(API).get('/task').set('Cookie', cookie).expect(200);
    const list = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    log.http('GET', '/task', res.status, { count: list.length });

    expect(Array.isArray(list)).toBe(true);
    log.ok(`system stable — task list accessible (${list.length} tasks)`);
  });

  // @plan T03.8
  // @covers EOCP-E3-02
  it('Step 3 – if task was accepted, it can be retrieved and deleted cleanly', async () => {
    log.step('Step 3 — cleanup: retrieve and delete task if accepted');

    if (!taskId) {
      log.ok('task was rejected at submission — nothing to clean up');
      return;
    }

    log.action(`GET /task/${taskId}`);
    const getRes = await request(API).get(`/task/${taskId}`).set('Cookie', cookie).expect(200);
    log.http('GET', `/task/${taskId}`, getRes.status, { status: getRes.body.data.status });
    expect(getRes.body.data.status).toBeDefined();
    log.ok(`task status: ${getRes.body.data.status}`);

    log.action(`DELETE /task/${taskId}`);
    const delRes = await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    log.http('DELETE', `/task/${taskId}`, delRes.status);
    expect(delRes.status).toBe(204);
    taskId = undefined;
    log.ok('task deleted cleanly');
  });
});
