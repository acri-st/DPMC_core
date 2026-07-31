import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.7 — Performance of deeply nested chain structures
// @covers EOCP-E4-03
//
// Description: Verifies that production chains with many processing steps are created and queried
//   within acceptable response times.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.7');

describe('T04.7 — Performance of deeply nested chain structures', () => {
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

    log.action('POST /production-chain (deep nesting)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.7-deep-chain-${Date.now()}`, kind: 'Standard', comment: 'T04.7 deep nesting' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (let i = 1; i <= 5; i++) {
      log.action(`POST processing-chain level-${i}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: `T04.7-level-${i}` });
      log.http('POST', `processing-chains (level-${i})`, pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
      expect(pc.status).toBe(201);
    }
    log.ok('chain with 5 processing steps ready');
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

  // @plan T04.7
  // @covers EOCP-E4-03
  it('Step 1 – deeply nested chain task is created normally', async () => {
    log.step('Step 1 — POST /task (deep chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.7 – deep chain execution',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.7
  // @covers EOCP-E4-03
  it('Step 2 – GET /production-chain/:id response time is acceptable for deeply nested chain', async () => {
    log.step(`Step 2 — GET /production-chain/${chainId} (latency check)`);

    const start = Date.now();
    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    const elapsed = Date.now() - start;
    log.http('GET', `/production-chain/${chainId}`, res.status, { elapsedMs: elapsed });
    expect(res.status).toBe(200);
    log.ok(`response in ${elapsed}ms`);
    expect(elapsed).toBeLessThan(5_000);
  });

  // @plan T04.7
  // @covers EOCP-E4-03
  it('Step 3 – all 5 processing chains are present in the structure', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (5 levels check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    log.ok(`processingChains count: ${pcs.length}`);
    expect(pcs.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i <= 5; i++) {
      const found = pcs.some((pc: { name: string }) => pc.name === `T04.7-level-${i}`);
      expect(found).toBe(true);
    }
    log.ok('all 5 levels present');
  });
});
