import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.10 — Regression protection when reusing chains
// @covers EOCP-E4-04
//
// Description: Verifies that modifying one production chain does not unintentionally affect
//   another that shares the same processing script.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.10');

describe('T04.10 — Regression protection when reusing chains', () => {
  let cookie: string;
  let chainAId: string;
  let chainBId: string;
  const createdTaskIds: string[] = [];
  const originalBComment = 'T04.10 chain B original';

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    const ts = Date.now();
    log.action('POST /production-chain (chain A)');
    const chainA = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.10-chain-A-${ts}`, kind: 'Standard', comment: 'T04.10 chain A original' });
    log.http('POST', '/production-chain (A)', chainA.status, chainA.status === 201 ? { id: chainA.body.data.id } : chainA.body);
    expect(chainA.status).toBe(201);
    chainAId = chainA.body.data.id;

    log.action('POST /production-chain (chain B)');
    const chainB = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.10-chain-B-${ts}`, kind: 'Standard', comment: originalBComment });
    log.http('POST', '/production-chain (B)', chainB.status, chainB.status === 201 ? { id: chainB.body.data.id } : chainB.body);
    expect(chainB.status).toBe(201);
    chainBId = chainB.body.data.id;

    for (const [id, stepName] of [[chainAId, 'T04.10-A-shared-step'], [chainBId, 'T04.10-B-shared-step']] as [string, string][]) {
      log.action(`POST processing-chain ${stepName}`);
      const pc = await request(API)
        .post(`/production-chain/${id}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: stepName });
      log.http('POST', `processing-chains (${stepName})`, pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
      expect(pc.status).toBe(201);
    }
    log.ok('two independent chains with shared script ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    for (const id of [chainAId, chainBId]) {
      if (id) await request(API).delete(`/production-chain/${id}`).set('Cookie', cookie);
    }
    log.ok('afterAll cleanup done');
  });

  // @plan T04.10
  // @covers EOCP-E4-04
  it('Step 1 – modifying chain A name and comment is accepted', async () => {
    log.step(`Step 1 — PATCH /production-chain/${chainAId}`);

    log.action(`PATCH /production-chain/${chainAId}`, { comment: 'T04.10 chain A MODIFIED' });
    const res = await request(API)
      .patch(`/production-chain/${chainAId}`)
      .set('Cookie', cookie)
      .send({ comment: 'T04.10 chain A MODIFIED' });
    log.http('PATCH', `/production-chain/${chainAId}`, res.status, { comment: res.body.data?.comment });
    expect(res.status).toBe(200);
    expect(res.body.data.comment).toBe('T04.10 chain A MODIFIED');
    log.ok('chain A modified');
  });

  // @plan T04.10
  // @covers EOCP-E4-04
  it('Step 2 – chain B task executes independently after chain A modification', async () => {
    log.step('Step 2 — POST /task (chain B)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainBId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.10 – chain B task after chain A modification',
    };
    log.action('POST /task', { productionChainId: chainBId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (chain B)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainBId);
    log.ok(`chain B task created: ${res.body.data.id}`);
  });

  // @plan T04.10
  // @covers EOCP-E4-04
  it('Step 3 – chain B comment and structure are unaffected by modification to chain A', async () => {
    log.step('Step 3 — GET both chains (isolation check)');

    const [resA, resB] = await Promise.all([
      request(API).get(`/production-chain/${chainAId}`).set('Cookie', cookie),
      request(API).get(`/production-chain/${chainBId}`).set('Cookie', cookie),
    ]);
    log.http('GET', `/production-chain/${chainAId}`, resA.status, { comment: resA.body.data?.comment });
    log.http('GET', `/production-chain/${chainBId}`, resB.status, { comment: resB.body.data?.comment });
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    expect(resA.body.data.comment).toBe('T04.10 chain A MODIFIED');
    expect(resB.body.data.comment).toBe(originalBComment);

    const pcsB = resB.body.data.processingChains ?? [];
    const found = pcsB.some((pc: { name: string }) => pc.name === 'T04.10-B-shared-step');
    log.ok(`chain B step intact: ${found}`);
    expect(found).toBe(true);
  });
});
