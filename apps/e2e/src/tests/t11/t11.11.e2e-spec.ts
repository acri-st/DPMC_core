import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.11 — Validation of invalid state transitions through APIs
// @covers EOCP-E11-02

const log = makeLogger('T11.11');

describe('T11.11 — Validation of invalid state transitions through APIs', () => {
  let cookie: string;
  let taskId: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /task (for transition tests)');
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T11.11 – invalid transition test',
    });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
    log.ok(`task created: ${taskId}, status: ${res.body.data.status}`);
  });

  afterAll(async () => {
    if (taskId) {
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    }
  });

  // @plan T11.11
  // @covers EOCP-E11-02
  it('Step 1 – PATCH /task/:id with invalid status is rejected or silently ignored (no 5xx)', async () => {
    log.step(`Step 1 — PATCH /task/${taskId} (DEFINITELY_INVALID_STATE)`);
    const res = await request(API).patch(`/task/${taskId}`).set('Cookie', cookie).send({ status: 'DEFINITELY_INVALID_STATE' });
    log.http('PATCH', `/task/${taskId}`, res.status, res.body);
    expect([200, 400, 409, 422]).toContain(res.status);
    log.ok(`result: ${res.status}`);
  });

  // @plan T11.11
  // @covers EOCP-E11-02
  it('Step 2 – GET /task/:id shows state is not corrupted', async () => {
    log.step(`Step 2 — GET /task/${taskId}`);
    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.status).not.toBe('DEFINITELY_INVALID_STATE');
    log.ok(`state intact: ${res.body.data.status}`);
  });

  // @plan T11.11
  // @covers EOCP-E11-02
  it('Step 3 – error response for invalid transition contains a message field', async () => {
    log.step(`Step 3 — PATCH /task/${taskId} (check error body)`);
    const res = await request(API).patch(`/task/${taskId}`).set('Cookie', cookie).send({ status: 'DEFINITELY_INVALID_STATE' });
    log.http('PATCH', `/task/${taskId}`, res.status, res.body);
    if (res.status >= 400 && res.status < 500) {
      const body = res.body as Record<string, unknown>;
      const hasMessage = body.message || body.error || body.detail || body.errors;
      expect(hasMessage).toBeTruthy();
      log.ok('error response has message field');
    } else {
      log.ok(`transition silently ignored (${res.status}) — no error body required`);
    }
  });
});
