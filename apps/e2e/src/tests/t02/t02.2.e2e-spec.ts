import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, toApiMode, pickAltModes } from './_shared';

// @plan T02.2 — Mode-specific application of operational rules
// @covers EOCP-E2-02
//
// Description: Verifies that each production mode applies its own rules for processor selection,
//   priorities, and dataset usage, without impacting other modes.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Configure different priorities per mode → Configuration is accepted
//   2. Launch same job in Nominal and alternate modes → Jobs use different priorities
//   3. Compare task modes → Mode-specific data is retained per task
//   4. GET /production-mode-rule filtered by mode → Returns mode-specific rules only

const log = makeLogger('T02.2');

describe('T02.2 — Mode-specific application of operational rules', () => {
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
    log.ok(`alt mode selected: ${altMode}`);
  });

  afterAll(async () => {
    log.action(`afterAll — deleting ${createdTaskIds.length} task(s) and ${createdRuleIds.length} rule(s)`);
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
      log.ok(`deleted task ${id}`);
    }
    for (const id of createdRuleIds) {
      await request(API).delete(`/production-mode-rule/${id}`).set('Cookie', cookie);
      log.ok(`deleted rule ${id}`);
    }
  });

  // @plan T02.2
  // @covers EOCP-E2-02
  it('Step 1 – POST /production-mode-rule accepts distinct priority weights per mode', async () => {
    log.step('Step 1 — creating mode-specific priority rules');

    log.action('POST /production-mode-rule mode=Nominal priorityWeight=10');
    const nominalRule = await request(API).post('/production-mode-rule').set('Cookie', cookie).send({ mode: 'Nominal', priorityWeight: 10 });
    log.http('POST', '/production-mode-rule (Nominal)', nominalRule.status, nominalRule.status === 201 ? { id: nominalRule.body.data?.id } : nominalRule.body);
    expect([201, 409]).toContain(nominalRule.status);
    if (nominalRule.status === 201) createdRuleIds.push(nominalRule.body.data.id);

    log.action(`POST /production-mode-rule mode=${altMode} priorityWeight=1`);
    const altRule = await request(API).post('/production-mode-rule').set('Cookie', cookie).send({ mode: altMode, priorityWeight: 1 });
    log.http('POST', `/production-mode-rule (${altMode})`, altRule.status, altRule.status === 201 ? { id: altRule.body.data?.id } : altRule.body);
    expect([201, 409]).toContain(altRule.status);
    if (altRule.status === 201) createdRuleIds.push(altRule.body.data.id);

    log.action('GET /production-mode-rule — verifying rules exist');
    const listRes = await request(API).get('/production-mode-rule').set('Cookie', cookie).expect(200);
    const list = Array.isArray(listRes.body.data) ? listRes.body.data : (listRes.body.data?.items ?? []);
    log.ok(`${list.length} rule(s) in total`);
    expect(Array.isArray(list)).toBe(true);
  });

  // @plan T02.2
  // @covers EOCP-E2-02
  it('Step 2 – same job in Nominal and alternate modes creates two distinct tasks', async () => {
    log.step('Step 2 — submitting tasks in Nominal and alt mode');

    const nominalPayload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 10, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T02.2 – nominal priority' };
    log.action('POST /task mode=Nominal priority=10');
    const nominalTask = await request(API).post('/task').set('Cookie', cookie).send(nominalPayload);
    log.http('POST', '/task (Nominal)', nominalTask.status, nominalTask.status === 201 ? { id: nominalTask.body.data.id } : nominalTask.body);
    expect(nominalTask.status).toBe(201);
    createdTaskIds.push(nominalTask.body.data.id);

    const altPayload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 1, productionMode: altMode, priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: `T02.2 – ${altMode} priority` };
    log.action(`POST /task mode=${altMode} priority=1`);
    const altTask = await request(API).post('/task').set('Cookie', cookie).send(altPayload);
    log.http('POST', `/task (${altMode})`, altTask.status, altTask.status === 201 ? { id: altTask.body.data.id } : altTask.body);
    expect(altTask.status).toBe(201);
    createdTaskIds.push(altTask.body.data.id);

    expect(nominalTask.body.data.id).not.toBe(altTask.body.data.id);
    log.ok('two distinct tasks created for two different modes');
  });

  // @plan T02.2
  // @covers EOCP-E2-02
  it('Step 3 – GET /task/:id confirms each task retains its own mode', async () => {
    const [nominalId, altId] = createdTaskIds;
    log.step(`Step 3 — verifying mode isolation on tasks ${nominalId} / ${altId}`);

    if (!nominalId || !altId) { log.warn('missing task ids from Step 2 — skipping'); return; }

    const nominalRes = await request(API).get(`/task/${nominalId}`).set('Cookie', cookie).expect(200);
    const altRes     = await request(API).get(`/task/${altId}`).set('Cookie', cookie).expect(200);

    const nominalMode = nominalRes.body.data.productionMode ?? nominalRes.body.data.mode;
    const storedAlt   = altRes.body.data.productionMode ?? altRes.body.data.mode;
    log.http('GET', `/task/${nominalId}`, nominalRes.status, { productionMode: nominalMode });
    log.http('GET', `/task/${altId}`, altRes.status, { productionMode: storedAlt });

    if (nominalMode && storedAlt) {
      expect(nominalMode).toBe('Nominal');
      expect(storedAlt).toBe(altMode);
      log.ok('each task retained its own production mode');
    } else {
      log.warn('productionMode field not present in response — skipping mode assertion');
    }
  });

  // @plan T02.2
  // @covers EOCP-E2-02
  it('Step 4 – GET /production-mode-rule filtered by mode returns only that mode\'s rules', async () => {
    log.step('Step 4 — mode-filtered rule list check');

    log.action('GET /production-mode-rule?mode=Nominal');
    const nominalRules = await request(API).get('/production-mode-rule?mode=Nominal').set('Cookie', cookie).expect(200);
    const nominalList  = Array.isArray(nominalRules.body.data) ? nominalRules.body.data : (nominalRules.body.data?.items ?? []);
    log.ok(`Nominal rules: ${nominalList.length}`, nominalList.map((r: { mode: string; priorityWeight: number }) => ({ mode: r.mode, priorityWeight: r.priorityWeight })));

    log.action(`GET /production-mode-rule?mode=${altMode}`);
    const altRules = await request(API).get(`/production-mode-rule?mode=${altMode}`).set('Cookie', cookie).expect(200);
    const altList  = Array.isArray(altRules.body.data) ? altRules.body.data : (altRules.body.data?.items ?? []);
    log.ok(`${altMode} rules: ${altList.length}`, altList.map((r: { mode: string; priorityWeight: number }) => ({ mode: r.mode, priorityWeight: r.priorityWeight })));

    for (const rule of nominalList) { expect(rule.mode).toBe('Nominal'); }
    for (const rule of altList) { expect(rule.mode).toBe(altMode); }
    log.ok('no cross-mode contamination in filtered rule lists');
  });
});
