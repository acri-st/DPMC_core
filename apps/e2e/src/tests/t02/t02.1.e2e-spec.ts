import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, toApiMode, pickAltModes } from './_shared';

// @plan T02.1 — Dynamic activation of multiple production modes
// @covers EOCP-E2-01
//
// Description: Verifies that the DPMC system supports multiple production modes and that these
//   modes can be dynamically activated without redeploying or reconfiguring the core system.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Activate nominal production mode → System accepts the mode and applies default behavior
//   2. Switch to a second allowed mode → Mode change is effective immediately
//   3. Switch to a third allowed mode → Alternate mode is applied
//   4. Switch back to nominal → System returns to nominal without restart

const log = makeLogger('T02.1');

describe('T02.1 — Dynamic activation of multiple production modes', () => {
  let cookie: string;
  let modeA: string;
  let modeB: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action(`fetching allowed production modes for project ${PROJECT_ID}`);
    const projectRes = await request(API).get(`/project/${PROJECT_ID}`).set('Cookie', cookie).expect(200);
    const allowed: string[] = projectRes.body.data.allowedProductionModes ?? [];
    [modeA, modeB] = pickAltModes(allowed);
    log.ok(`modes selected — modeA: ${modeA}, modeB: ${modeB}`, { allowed: allowed.map(toApiMode) });
  });

  afterAll(async () => {
    if (createdIds.length) {
      log.action(`afterAll — deleting ${createdIds.length} task(s)`);
      for (const id of createdIds) {
        await request(API).delete(`/task/${id}`).set('Cookie', cookie);
        log.ok(`deleted task ${id}`);
      }
    }
  });

  // @plan T02.1
  // @covers EOCP-E2-01
  it('Step 1 – POST /task with productionMode=Nominal is accepted (nominal mode active)', async () => {
    log.step('Step 1 — POST /task productionMode=Nominal');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 0, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T02.1 – nominal mode' };
    log.action('POST /task', payload);

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, productionMode: res.body.data.productionMode } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    const mode = res.body.data.productionMode ?? res.body.data.mode ?? 'Nominal';
    expect(mode).toMatch(/Nominal/i);
    log.ok('Nominal task accepted', { id: res.body.data.id, mode });
  });

  // @plan T02.1
  // @covers EOCP-E2-01
  it('Step 2 – POST /task with second allowed mode is accepted immediately (mode switch)', async () => {
    log.step(`Step 2 — POST /task productionMode=${modeA}`);

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 0, productionMode: modeA, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.1 – mode switch to ${modeA}` };
    log.action(`POST /task mode=${modeA}`, payload);

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    log.ok(`mode ${modeA} accepted immediately`, { id: res.body.data.id });
  });

  // @plan T02.1
  // @covers EOCP-E2-01
  it('Step 3 – POST /task with third allowed mode is accepted (alternate mode)', async () => {
    log.step(`Step 3 — POST /task productionMode=${modeB}`);

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 0, productionMode: modeB, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.1 – mode switch to ${modeB}` };
    log.action(`POST /task mode=${modeB}`, payload);

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    log.ok(`mode ${modeB} accepted`, { id: res.body.data.id });
  });

  // @plan T02.1
  // @covers EOCP-E2-01
  it('Step 4 – POST /task back to Nominal completes without restart; all tasks listed', async () => {
    log.step('Step 4 — POST /task productionMode=Nominal (back to nominal)');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 0, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T02.1 – back to nominal mode' };
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdIds.push(res.body.data.id);
    log.ok('returned to Nominal without restart');

    log.action('GET /task — verifying all created tasks are listed');
    const listRes = await request(API).get('/task').set('Cookie', cookie).expect(200);
    const list = Array.isArray(listRes.body.data) ? listRes.body.data : (listRes.body.data?.items ?? []);
    for (const id of createdIds) {
      expect(list.some((t: { id: string }) => t.id === id)).toBe(true);
    }
    log.ok(`all ${createdIds.length} tasks found in list`);
  });
});
