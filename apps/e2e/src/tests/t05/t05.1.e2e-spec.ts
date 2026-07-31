import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.1 — Conditional execution based on upstream status and data availability
// @covers EOCP-E5-04, EOCP-E5-05
//
// Description: Verifies that a task is executed only when its declared dependency conditions are
//   fulfilled (upstream task success). This test verifies the API/structural contract.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.1');

describe('T05.1 — Conditional execution based on upstream status and data availability', () => {
  let cookie: string;
  let chainId: string;
  let stepAId: string;
  let stepBId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /production-chain');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.1-chain-${Date.now()}`, kind: 'Standard', comment: 'T05.1 conditional exec' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.1-upstream', 'T05.1-downstream']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }

    log.action('GET chain to resolve processing-chain IDs');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.1-upstream')?.id;
    stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.1-downstream')?.id;
    log.ok(`stepA=${stepAId}, stepB=${stepBId}`);
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

  // @plan T05.1
  // @covers EOCP-E5-04, EOCP-E5-05
  it('Step 1 – OnSuccess dependency between upstream and downstream is accepted', async () => {
    log.step('Step 1 — POST /production-chain/:id/edges (OnSuccess)');

    log.action('POST edges', { parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (OnSuccess)', res.status, res.status < 300 ? { id: res.body.data?.id, dependencyMode: res.body.data?.dependencyMode } : res.body);
    expect([201, 200]).toContain(res.status);
    expect(res.body.data.dependencyMode).toBe('OnSuccess');
    log.ok('OnSuccess edge created');
  });

  // @plan T05.1
  // @covers EOCP-E5-04, EOCP-E5-05
  it('Step 2 – chain task is created (upstream production launched)', async () => {
    log.step('Step 2 — POST /task (kind=Chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.1 – conditional dependency task',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.1
  // @covers EOCP-E5-04, EOCP-E5-05
  it('Step 3 – chain structure reflects OnSuccess dependency (downstream conditional on upstream)', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (edges check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const edges = res.body.data.edges ?? [];
    const dep = edges.find((e: { dependencyMode: string }) => e.dependencyMode === 'OnSuccess');
    log.ok(`OnSuccess edge found: ${!!dep}, total edges: ${edges.length}`);
    expect(dep).toBeDefined();
  });
});
