import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.2 — Management of job lifecycle through APIs
// @covers EOCP-E11-02

const log = makeLogger('T11.2');

describe('T11.2 — Management of job lifecycle through APIs', () => {
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

  // @plan T11.2
  // @covers EOCP-E11-02
  it('Step 1 – POST /task creates a task with id, kind, status', async () => {
    log.step('Step 1 — POST /task');
    log.action('POST /task', { kind: 'Standalone' });
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T11.2 – lifecycle test',
    });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, status: res.body.data.status } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    expect(taskId).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    expect(res.body.data.status).toBeDefined();
    log.ok(`task created: ${taskId}`);
  });

  // @plan T11.2
  // @covers EOCP-E11-02
  it('Step 2 – GET /task/:id returns the task with correct id and status', async () => {
    log.step(`Step 2 — GET /task/${taskId}`);
    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
    expect(typeof res.body.data.status).toBe('string');
    log.ok(`status: ${res.body.data.status}`);
  });

  // @plan T11.2
  // @covers EOCP-E11-02
  it('Step 3 – PATCH /task/:id with status Suspended is accepted or rejected cleanly (no 5xx)', async () => {
    log.step(`Step 3 — PATCH /task/${taskId} (Suspended)`);
    const res = await request(API).patch(`/task/${taskId}`).set('Cookie', cookie).send({ status: 'Suspended' });
    log.http('PATCH', `/task/${taskId}`, res.status, res.status < 300 ? { status: res.body.data?.status } : res.body);
    expect([200, 400, 409, 422]).toContain(res.status);
    log.ok(`patch result: ${res.status}`);
  });

  // @plan T11.2
  // @covers EOCP-E11-02
  it('Step 4 – PATCH /task/:id with status Queued (resume) is accepted or rejected cleanly', async () => {
    log.step(`Step 4 — PATCH /task/${taskId} (Queued)`);
    const res = await request(API).patch(`/task/${taskId}`).set('Cookie', cookie).send({ status: 'Queued' });
    log.http('PATCH', `/task/${taskId}`, res.status, res.status < 300 ? { status: res.body.data?.status } : res.body);
    expect([200, 400, 409, 422]).toContain(res.status);
    log.ok(`patch result: ${res.status}`);
  });

  // @plan T11.2
  // @covers EOCP-E11-02
  it('Step 5 – DELETE /task/:id returns 204 and subsequent GET returns 404', async () => {
    log.step(`Step 5 — DELETE /task/${taskId} then GET`);
    const del = await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    log.http('DELETE', `/task/${taskId}`, del.status);
    expect(del.status).toBe(204);

    const get = await request(API).get(`/task/${taskId}`).set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, get.status);
    expect(get.status).toBe(404);
    log.ok('task deleted and confirmed gone');
  });
});
