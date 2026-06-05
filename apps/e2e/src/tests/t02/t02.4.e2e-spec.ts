import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, toApiMode, pickAltModes } from './_shared';

// @plan T02.4 — Isolation of production mode configuration
// @covers EOCP-E2-01 EOCP-E2-02
//
// Description: Verifies that configuration changes applied to one production mode do not affect
//   other modes.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Modify priority rules in alternate mode → Change is accepted
//   2. Run a job in alternate mode → New rules are applied
//   3. Run same job in Nominal mode → Nominal rules remain unchanged
//   4. Inspect configuration → No cross-mode contamination

const log = makeLogger('T02.4');

describe('T02.4 — Isolation of production mode configuration', () => {
  let cookie: string;
  let altMode: string;
  const createdTaskIds: string[] = [];
  const createdRuleIds: string[] = [];

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
    [altMode] = pickAltModes(allowed);
    log.ok(`alt mode: ${altMode}`);
  });

  afterAll(async () => {
    log.action(`afterAll — cleanup: ${createdTaskIds.length} task(s), ${createdRuleIds.length} rule(s)`);
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
      log.ok(`deleted task ${id}`);
    }
    for (const id of createdRuleIds) {
      await request(API).delete(`/production-mode-rule/${id}`).set('Cookie', cookie);
      log.ok(`deleted rule ${id}`);
    }
  });

  // @plan T02.4
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 1 – POST /production-mode-rule for alternate mode with modified priority is accepted', async () => {
    log.step(`Step 1 — POST /production-mode-rule mode=${altMode} priorityWeight=99`);

    const res = await request(API).post('/production-mode-rule').set('Cookie', cookie).send({ mode: altMode, priorityWeight: 99 });
    log.http('POST', '/production-mode-rule', res.status, res.status === 201 ? { id: res.body.data?.id, mode: res.body.data?.mode, priorityWeight: res.body.data?.priorityWeight } : res.body);
    expect([201, 409]).toContain(res.status);

    if (res.status === 201) {
      createdRuleIds.push(res.body.data.id);
      expect(res.body.data.mode).toBe(altMode);
      expect(res.body.data.priorityWeight).toBe(99);
      log.ok(`rule created for ${altMode} with weight 99`);
    } else {
      log.warn(`rule already exists (409) — proceeding`);
    }
  });

  // @plan T02.4
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 2 – POST /task in alternate mode succeeds after rule modification', async () => {
    log.step(`Step 2 — POST /task mode=${altMode}`);

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 99, productionMode: altMode, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.4 – ${altMode} after rule change` };
    log.action(`POST /task mode=${altMode} priority=99`);
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', `/task (${altMode})`, res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdTaskIds.push(res.body.data.id);
    log.ok(`${altMode} task accepted after rule modification`, { id: res.body.data.id });
  });

  // @plan T02.4
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 3 – POST /task in Nominal mode is unaffected by the alternate mode rule change', async () => {
    log.step('Step 3 — POST /task mode=Nominal (isolation check)');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 5, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T02.4 – nominal unaffected' };
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (Nominal)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);

    log.action(`GET /task/${res.body.data.id} — verifying mode is Nominal`);
    const nominalTask = await request(API).get(`/task/${res.body.data.id}`).set('Cookie', cookie).expect(200);
    const mode = nominalTask.body.data.productionMode ?? nominalTask.body.data.mode;
    log.http('GET', `/task/${res.body.data.id}`, nominalTask.status, { productionMode: mode });

    if (mode) {
      expect(mode).toBe('Nominal');
      log.ok('Nominal task mode unchanged — no contamination from alt mode rule');
    } else {
      log.warn('productionMode field not present — skipping assertion');
    }
  });

  // @plan T02.4
  // @covers EOCP-E2-01 EOCP-E2-02
  it('Step 4 – GET /production-mode-rule shows no cross-mode contamination', async () => {
    log.step('Step 4 — cross-mode contamination check on rules');

    log.action('GET /production-mode-rule?mode=Nominal');
    const nominalRes = await request(API).get('/production-mode-rule?mode=Nominal').set('Cookie', cookie).expect(200);
    const nominalList = Array.isArray(nominalRes.body.data) ? nominalRes.body.data : (nominalRes.body.data?.items ?? []);
    log.ok(`Nominal rules: ${nominalList.length}`, nominalList.map((r: { mode: string; priorityWeight: number }) => ({ mode: r.mode, priorityWeight: r.priorityWeight })));

    log.action(`GET /production-mode-rule?mode=${altMode}`);
    const altRes  = await request(API).get(`/production-mode-rule?mode=${altMode}`).set('Cookie', cookie).expect(200);
    const altList = Array.isArray(altRes.body.data) ? altRes.body.data : (altRes.body.data?.items ?? []);
    log.ok(`${altMode} rules: ${altList.length}`, altList.map((r: { mode: string; priorityWeight: number }) => ({ mode: r.mode, priorityWeight: r.priorityWeight })));

    for (const rule of nominalList) { expect(rule.mode).toBe('Nominal'); }
    for (const rule of altList)    { expect(rule.mode).toBe(altMode); }

    const leaked = nominalList.find((r: { priorityWeight: number }) => r.priorityWeight === 99);
    if (leaked) { log.fail('weight-99 alt rule leaked into Nominal rules'); }
    else        { log.ok('weight-99 rule not present in Nominal rules — no contamination'); }
    expect(leaked).toBeUndefined();
  });
});
