import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, toApiMode, pickAltModes } from './_shared';

// @plan T02.3 — Concurrent execution of productions in different modes
// @covers EOCP-E2-01 EOCP-E2-02
//
// Description: Ensures that multiple production modes can be used simultaneously without
//   interference, allowing concurrent productions with different operational constraints.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Launch a Nominal task → Task enters scheduling
//   2. Launch a second mode task concurrently → Both tasks are scheduled
//   3. Launch a third mode task concurrently → No scheduling conflict
//   4. All three tasks are independently listed with distinct IDs

const log = makeLogger('T02.3');

describe('T02.3 — Concurrent execution of productions in different modes', () => {
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

    log.action(`fetching allowed modes for project ${PROJECT_ID}`);
    const projectRes = await request(API).get(`/project/${PROJECT_ID}`).set('Cookie', cookie).expect(200);
    const allowed: string[] = projectRes.body.data.allowedProductionModes ?? [];
    [modeA, modeB] = pickAltModes(allowed);
    log.ok(`concurrent modes: ${modeA}, ${modeB}`);
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

  // @plan T02.3
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 1 – POST /task in Nominal mode is accepted and enters scheduling', async () => {
    log.step('Step 1 — POST /task mode=Nominal');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 5, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T02.3 – nominal concurrent' };
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (Nominal)', res.status, res.status === 201 ? { id: res.body.data.id, status: res.body.data.status } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    expect(res.body.data.status).toBeDefined();
    log.ok('Nominal task accepted', { id: res.body.data.id, status: res.body.data.status });
  });

  // @plan T02.3
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 2 – POST /task in alternate mode while Nominal task exists creates independent task', async () => {
    log.step(`Step 2 — POST /task mode=${modeA} (concurrent with Nominal)`);

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 5, productionMode: modeA, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.3 – ${modeA} concurrent` };
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', `/task (${modeA})`, res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    expect(res.body.data.id).not.toBe(createdIds[0]);
    log.ok(`${modeA} task is independent from Nominal task`, { ids: createdIds });
  });

  // @plan T02.3
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 3 – POST /task in second alternate mode with two others pending — no conflict', async () => {
    log.step(`Step 3 — POST /task mode=${modeB} (3rd concurrent task)`);

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 5, productionMode: modeB, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.3 – ${modeB} concurrent` };
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', `/task (${modeB})`, res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdIds.push(res.body.data.id);
    log.ok(`3 concurrent tasks across 3 modes — no scheduling conflict`, { count: createdIds.length });
  });

  // @plan T02.3
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 4 – all three concurrent tasks are independently listed with distinct IDs', async () => {
    log.step('Step 4 — GET /task verifying all 3 tasks present');

    const listRes = await request(API).get('/task').set('Cookie', cookie).expect(200);
    const list = Array.isArray(listRes.body.data) ? listRes.body.data : (listRes.body.data?.items ?? []);
    log.http('GET', '/task', listRes.status, { total: list.length });

    for (const id of createdIds) {
      const found = list.some((t: { id: string }) => t.id === id);
      if (found) { log.ok(`task ${id} found in list`); }
      else        { log.fail(`task ${id} NOT found in list`); }
      expect(found).toBe(true);
    }

    expect(new Set(createdIds).size).toBe(3);
    log.ok('all 3 tasks have distinct IDs and are independently listed');
  });
});
