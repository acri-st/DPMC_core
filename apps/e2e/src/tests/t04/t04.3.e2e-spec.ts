import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.3 — Embedding of processing chains within production chains
// @covers EOCP-E4-03
//
// Description: Verifies that production chains can embed multiple processing chains, enabling
//   hierarchical and modular workflow construction.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.3');

describe('T04.3 — Embedding of processing chains within production chains', () => {
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

    log.action('POST /production-chain (embed test)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.3-embed-chain-${Date.now()}`, kind: 'Standard', comment: 'T04.3 embedding test' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const [name, comment] of [['T04.3-chain-alpha', 'alpha'], ['T04.3-chain-beta', 'beta']]) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name, comment });
      log.http('POST', `processing-chains (${name})`, pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
      expect(pc.status).toBe(201);
    }
    log.ok('chain with two embedded processing chains ready');
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

  // @plan T04.3
  // @covers EOCP-E4-03
  it('Step 1 – production chain with two embedded processing chains is accepted', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (count check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    log.ok(`processingChains count: ${pcs.length}`);
    expect(pcs.length).toBeGreaterThanOrEqual(2);
  });

  // @plan T04.3
  // @covers EOCP-E4-03
  it('Step 2 – chain task is created referencing the production chain', async () => {
    log.step('Step 2 — POST /task (kind=Chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.3 – embedded chains task',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.3
  // @covers EOCP-E4-03
  it('Step 3 – both processing chains are embedded (alpha and beta present)', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (names check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    const names = pcs.map((pc: { name: string }) => pc.name);
    log.ok(`processing chain names: ${names.join(', ')}`);
    expect(names).toContain('T04.3-chain-alpha');
    expect(names).toContain('T04.3-chain-beta');
  });

  // @plan T04.3
  // @covers EOCP-E4-03
  it('Step 4 – production chain with embedded chains appears in the list', async () => {
    log.step('Step 4 — GET /production-chain (list check)');

    const res = await request(API).get('/production-chain').set('Cookie', cookie);
    log.http('GET', '/production-chain', res.status);
    expect(res.status).toBe(200);

    const items = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    log.ok(`list count: ${items.length}`);
    expect(items.some((c: { id: string }) => c.id === chainId)).toBe(true);
  });
});
