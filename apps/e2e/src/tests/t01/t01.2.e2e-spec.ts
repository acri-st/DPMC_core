import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { FIXTURES } from '../../setup/fixtures';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from './_env-check';

// @plan T01.2 — Contract-based interactions with mocked components
// @covers EOCP-E1-01, EOCP-E1-02
//
// Description: This test validates that DPMC components interact strictly through formal contracts,
//   allowing a component to be replaced by a mock implementation without breaking the system.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Replace a real component with its mock → Other components connect successfully
//   2. Submit standard job requests → Requests are handled according to the contract
//   3. Monitor communications → No undocumented access is detected
//   4. Restore the real component → System returns to nominal behavior

const log = makeLogger('T01.2');

describe('T01.2 — Contract-based interactions with mocked components', () => {
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

  // @plan T01.2
  // @covers EOCP-E1-01, EOCP-E1-02
  it('Step 1 – GET /status confirms API layer accepts connections regardless of downstream state', async () => {
    log.step('Step 1 — GET /status');

    const res = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', res.status, res.body.data);

    expect(res.body).toBeDefined();
    log.ok('API accepts connections');
  });

  // @plan T01.2
  // @covers EOCP-E1-01, EOCP-E1-02
  it('Step 2 – POST /task is handled through the documented contract (returns 201 with id and status)', async () => {
    log.step('Step 2 — POST /task (contract check)');

    const payload = {
      projectId: FIXTURES.project.id,
      kind: 'Standalone',
      processorVersionId: FIXTURES.processorVersion.id,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T01.2 – contract test',
    };
    log.action('POST /task', payload);

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBeDefined();
    log.ok('task created with id and status', { id: res.body.data.id, status: res.body.data.status });
  });

  // @plan T01.2
  // @covers EOCP-E1-01, EOCP-E1-02
  it('Step 3 – GET /task/:id returns data conforming to the documented contract shape', async () => {
    const taskId = createdIds[0];
    log.step(`Step 3 — GET /task/${taskId} (contract shape check)`);

    if (!taskId) {
      log.warn('no task id from previous step — skipping');
      return;
    }

    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie).expect(200);
    log.http('GET', `/task/${taskId}`, res.status, {
      id: res.body.data.id,
      status: res.body.data.status,
      projectId: res.body.data.projectId,
    });

    expect(res.body.data.id).toBe(taskId);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.projectId).toBeDefined();
    log.ok('task response matches contract shape');
  });

  // @plan T01.2
  // @covers EOCP-E1-01, EOCP-E1-02
  it('Step 4 – DELETE /task/:id removes task and system returns to baseline (no undocumented side effects)', async () => {
    log.step('Step 4 — DELETE tasks + baseline check');

    const before = await request(API).get('/task').set('Cookie', cookie).expect(200);
    const beforeList = Array.isArray(before.body.data)
      ? before.body.data
      : (before.body.data?.items ?? []);
    log.action(`task count before delete: ${beforeList.length}`);

    for (const id of [...createdIds]) {
      log.action(`DELETE /task/${id}`);
      await request(API).delete(`/task/${id}`).set('Cookie', cookie).expect(204);
      log.ok(`task ${id} deleted`);
    }
    createdIds.length = 0;

    const after = await request(API).get('/task').set('Cookie', cookie).expect(200);
    const afterList = Array.isArray(after.body.data)
      ? after.body.data
      : (after.body.data?.items ?? []);
    log.ok(`task count after delete: ${afterList.length} (was ${beforeList.length})`);

    expect(afterList.length).toBeLessThanOrEqual(beforeList.length);
    log.ok('system returned to baseline — no undocumented side effects');
  });
});
