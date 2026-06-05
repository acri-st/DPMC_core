import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.1 — Execution of linear processing chains
// @covers EOCP-E4-01 EOCP-E4-03 EOCP-E4-04
//
// Description: Verifies that simple linear production chains are accepted, tasks referencing them
//   are created, and the chain structure is retrievable.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.1');

describe('T04.1 — Execution of linear processing chains', () => {
  let cookie: string;
  let chainId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /production-chain (linear chain)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.1-linear-chain-${Date.now()}`, kind: 'Standard', comment: 'T04.1 linear chain' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;
    log.ok(`chain created: ${chainId}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (chainId) {
      log.action(`afterAll — deleting chain ${chainId}`);
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T04.1
  // @covers EOCP-E4-01
  it('Step 1 – linear production chain definition is accepted (POST /production-chain)', async () => {
    log.step('Step 1 — GET /production-chain/:id + add two processing chains');

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status, { id: res.body.data?.id, kind: res.body.data?.kind });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(chainId);
    expect(res.body.data.kind).toBe('Standard');

    log.action('POST processing-chain step-A');
    const pcA = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.1-step-A', comment: 'first step' });
    log.http('POST', `/production-chain/${chainId}/processing-chains (step-A)`, pcA.status, pcA.status === 201 ? { id: pcA.body.data?.id } : pcA.body);
    expect(pcA.status).toBe(201);

    log.action('POST processing-chain step-B');
    const pcB = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.1-step-B', comment: 'second step' });
    log.http('POST', `/production-chain/${chainId}/processing-chains (step-B)`, pcB.status, pcB.status === 201 ? { id: pcB.body.data?.id } : pcB.body);
    expect(pcB.status).toBe(201);
    log.ok('two processing chains added');
  });

  // @plan T04.1
  // @covers EOCP-E4-01
  it('Step 2 – chain task is created via POST /task with kind=Chain', async () => {
    log.step('Step 2 — POST /task (kind=Chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.1 – linear chain execution',
    };
    log.action('POST /task', { kind: 'Chain', productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.1
  // @covers EOCP-E4-01
  it('Step 3 – chain task is accessible with a valid status', async () => {
    log.step(`Step 3 — GET /task/${createdTaskIds[0]}`);

    const res = await request(API).get(`/task/${createdTaskIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/task/${createdTaskIds[0]}`, res.status, { status: res.body.data?.status });
    expect(res.status).toBe(200);

    const validStatuses = ['Edited', 'Queued', 'Running', 'Done', 'Error', 'Suspended'];
    expect(validStatuses).toContain(res.body.data.status);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task status: ${res.body.data.status}`);
  });

  // @plan T04.1
  // @covers EOCP-E4-01
  it('Step 4 – chain structure (processing chains A and B) is retrievable', async () => {
    log.step(`Step 4 — GET /production-chain/${chainId} (structure check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.latestVersion?.processingChains ?? [];
    log.ok(`processingChains count: ${pcs.length}`);
    expect(pcs.length).toBeGreaterThanOrEqual(2);
    const names = pcs.map((pc: { name: string }) => pc.name);
    expect(names).toContain('T04.1-step-A');
    expect(names).toContain('T04.1-step-B');
    log.ok('both processing chains present');
  });
});
