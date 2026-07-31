import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.4 — Reuse of embedded processing chains across productions
// @covers EOCP-E4-04
//
// Description: Verifies that the same processing script can be embedded in multiple production
//   chains independently, and that modifying one chain does not affect another.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.4');

describe('T04.4 — Reuse of embedded processing chains across productions', () => {
  let cookie: string;
  let chainAId: string;
  let chainBId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    const ts = Date.now();
    for (const [label, name] of [['A', `T04.4-prod-A-${ts}`], ['B', `T04.4-prod-B-${ts}`]] as [string, string][]) {
      log.action(`POST /production-chain (chain ${label})`);
      const chain = await request(API)
        .post('/production-chain')
        .set('Cookie', cookie)
        .send({ name, kind: 'Standard', comment: `T04.4 chain ${label}` });
      log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
      expect(chain.status).toBe(201);
      if (label === 'A') chainAId = chain.body.data.id;
      else chainBId = chain.body.data.id;
    }

    for (const [id, label] of [[chainAId, 'A'], [chainBId, 'B']] as [string, string][]) {
      log.action(`POST processing-chain shared-pc in chain ${label}`);
      const pc = await request(API)
        .post(`/production-chain/${id}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.4-shared-pc' });
      log.http('POST', `processing-chains (chain ${label})`, pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
      expect(pc.status).toBe(201);
    }
    log.ok('two production chains with shared script ready');
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

  // @plan T04.4
  // @covers EOCP-E4-04
  it('Step 1 – two production chains reference the same processing script (reuse accepted)', async () => {
    log.step('Step 1 — GET both chains and compare processingScriptId');

    const [resA, resB] = await Promise.all([
      request(API).get(`/production-chain/${chainAId}`).set('Cookie', cookie),
      request(API).get(`/production-chain/${chainBId}`).set('Cookie', cookie),
    ]);
    log.http('GET', `/production-chain/${chainAId}`, resA.status);
    log.http('GET', `/production-chain/${chainBId}`, resB.status);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const pcsA = resA.body.data.processingChains ?? [];
    const pcsB = resB.body.data.processingChains ?? [];
    log.ok(`chain A script: ${pcsA[0]?.processingScriptId}, chain B script: ${pcsB[0]?.processingScriptId}`);
    expect(pcsA[0].processingScriptId).toBe(PROCESSING_SCRIPT_ID);
    expect(pcsB[0].processingScriptId).toBe(PROCESSING_SCRIPT_ID);
    expect(chainAId).not.toBe(chainBId);
  });

  // @plan T04.4
  // @covers EOCP-E4-04
  it('Step 2 – tasks for both productions are created independently', async () => {
    log.step('Step 2 — POST /task x2 (one per chain)');

    const makePayload = (chainId: string, label: string) => ({
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: `T04.4 – chain ${label} task`,
    });

    log.action('POST /task (chain A + chain B)');
    const [taskA, taskB] = await Promise.all([
      request(API).post('/task').set('Cookie', cookie).send(makePayload(chainAId, 'A')),
      request(API).post('/task').set('Cookie', cookie).send(makePayload(chainBId, 'B')),
    ]);
    log.http('POST', '/task (chain A)', taskA.status, taskA.status === 201 ? { id: taskA.body.data.id } : taskA.body);
    log.http('POST', '/task (chain B)', taskB.status, taskB.status === 201 ? { id: taskB.body.data.id } : taskB.body);
    expect(taskA.status).toBe(201);
    expect(taskB.status).toBe(201);
    createdTaskIds.push(taskA.body.data.id, taskB.body.data.id);
    expect(taskA.body.data.id).not.toBe(taskB.body.data.id);
    log.ok('two independent tasks created');
  });

  // @plan T04.4
  // @covers EOCP-E4-04
  it('Step 3 – modifying chain A comment does not affect chain B', async () => {
    log.step(`Step 3 — PATCH /production-chain/${chainAId} then GET chain B`);

    log.action(`PATCH /production-chain/${chainAId}`, { comment: 'T04.4 – chain A modified' });
    const patch = await request(API)
      .patch(`/production-chain/${chainAId}`)
      .set('Cookie', cookie)
      .send({ comment: 'T04.4 – chain A modified' });
    log.http('PATCH', `/production-chain/${chainAId}`, patch.status, { comment: patch.body.data?.comment });
    expect(patch.status).toBe(200);
    expect(patch.body.data.comment).toBe('T04.4 – chain A modified');

    log.action(`GET /production-chain/${chainBId}`);
    const resB = await request(API).get(`/production-chain/${chainBId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainBId}`, resB.status, { comment: resB.body.data?.comment });
    expect(resB.status).toBe(200);
    expect(resB.body.data.comment).toBe('T04.4 chain B');
    log.ok('chain B unaffected by chain A modification');
  });
});
