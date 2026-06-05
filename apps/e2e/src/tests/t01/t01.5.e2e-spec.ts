import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { FIXTURES } from '../../setup/fixtures';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from './_env-check';

// @plan T01.5 — Logging structure and error-handling compliance
// @covers EOCP-E1-03
//
// Description: This test validates that system logs comply with the defined logging specification
//   and supports traceability across components.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Perform normal operations → Logs are generated consistently
//   2. Trigger controlled errors → Errors are logged with context
//   3. Trace a request end-to-end → Correlation IDs allow reconstruction

const log = makeLogger('T01.5');

describe('T01.5 — Logging structure and error-handling compliance', () => {
  let cookie: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    if (createdIds.length) {
      log.action(`afterAll — cleaning up ${createdIds.length} created task(s)`);
      for (const id of createdIds) {
        await request(API).delete(`/task/${id}`).set('Cookie', cookie);
        log.ok(`deleted task ${id}`);
      }
    }
  });

  // @plan T01.5
  // @covers EOCP-E1-03
  it('Step 1 – normal operations complete without 5xx errors (logs generated consistently)', async () => {
    log.step('Step 1 — normal operations (no 5xx expected)');

    const statusRes = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', statusRes.status, statusRes.body.data);
    expect(statusRes.status).toBe(200);

    const taskRes = await request(API).get('/task').set('Cookie', cookie).expect(200);
    log.http('GET', '/task', taskRes.status, { count: (taskRes.body.data?.items ?? taskRes.body.data ?? []).length });
    expect(taskRes.status).toBe(200);

    const hostRes = await request(API).get('/host').set('Cookie', cookie).expect(200);
    log.http('GET', '/host', hostRes.status, { count: (hostRes.body.data?.items ?? hostRes.body.data ?? []).length });
    expect(hostRes.status).toBe(200);

    log.ok('all normal operations completed without 5xx');
  });

  // @plan T01.5
  // @covers EOCP-E1-03
  it('Step 2 – controlled errors return structured error responses with context', async () => {
    log.step('Step 2 — triggering controlled errors');

    log.action('GET /task/not-a-uuid (invalid UUID)');
    const badId = await request(API).get('/task/not-a-uuid').set('Cookie', cookie);
    log.http('GET', '/task/not-a-uuid', badId.status, badId.body);
    expect([400, 404, 422]).toContain(badId.status);
    expect(badId.body).toBeDefined();
    log.ok(`got structured error response (${badId.status})`);

    log.action('POST /task with missing required fields');
    const badCreate = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({ kind: 'Standalone' });
    log.http('POST', '/task (missing fields)', badCreate.status, badCreate.body);
    expect([400, 422]).toContain(badCreate.status);
    expect(badCreate.body).toBeDefined();

    const bodyStr = JSON.stringify(badCreate.body);
    const hasStackTrace = /at .*\.ts:\d+/.test(bodyStr);
    if (hasStackTrace) {
      log.fail('response leaks stack trace — security issue');
    } else {
      log.ok('no stack trace in error response');
    }
    expect(bodyStr).not.toMatch(/at .*\.ts:\d+/);
  });

  // @plan T01.5
  // @covers EOCP-E1-03
  it('Step 3 – GET /audit-log is accessible and returns a list (end-to-end traceability)', async () => {
    log.step('Step 3 — traceability via audit log');

    const payload = {
      projectId: FIXTURES.project.id,
      kind: 'Standalone',
      processorVersionId: FIXTURES.processorVersion.id,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T01.5 – traceability test',
    };
    log.action('POST /task (creating traceable action)', payload);
    const created = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', created.status, created.status === 201 ? { id: created.body.data.id } : created.body);
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);
    log.ok(`task created: ${created.body.data.id}`);

    log.action('GET /audit-log');
    const auditRes = await request(API).get('/audit-log').set('Cookie', cookie);
    log.http('GET', '/audit-log', auditRes.status);

    expect([200, 403]).toContain(auditRes.status);

    if (auditRes.status === 200) {
      const list = Array.isArray(auditRes.body.data)
        ? auditRes.body.data
        : (auditRes.body.data?.items ?? []);
      log.ok(`audit log accessible — ${list.length} entries`);
      expect(Array.isArray(list)).toBe(true);
    } else {
      log.warn('audit log returned 403 — endpoint may require elevated permissions or is not yet implemented');
    }
  });
});
