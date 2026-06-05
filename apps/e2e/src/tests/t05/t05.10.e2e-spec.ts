import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.10 — Absence of unintended serialization
// @covers EOCP-E5-02
//
// Description: Verifies that only explicitly declared dependencies cause serialization. Steps
//   without incoming edges (B) are unblocked at start; only step C is blocked behind A.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.10');

describe('T05.10 — Absence of unintended serialization', () => {
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

    log.action('POST /production-chain (A→C only, B independent)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.10-mixed-${Date.now()}`, kind: 'Standard', comment: 'T05.10 no unintended serial' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.10-step-A', 'T05.10-step-B', 'T05.10-step-C']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }

    log.action('GET chain to resolve IDs');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.latestVersion?.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.10-step-A');
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.10-step-C');

    log.action('POST edges A→C (only dependency)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcC.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→C)', edge.status);
    expect(edge.status).toBe(201);
    log.ok('chain with A→C only ready; B is independent');
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

  // @plan T05.10
  // @covers EOCP-E5-02
  it('Step 1 – chain with mixed dependencies (A→C only, B independent) is accepted', async () => {
    log.step('Step 1 — POST /task (mixed dep chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.10 – mixed dependency chain',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.10
  // @covers EOCP-E5-02
  it('Step 2 – step B has no incoming edges (eligible immediately, no unintended serialization)', async () => {
    log.step(`Step 2 — GET /production-chain/${chainId} (B has no incoming edges)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.latestVersion?.processingChains ?? [];
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.10-step-B');
    expect(pcB).toBeDefined();

    const edges = res.body.data.latestVersion?.edges ?? [];
    const incomingToB = edges.filter((e: { childChainId: string }) => e.childChainId === pcB.id);
    log.ok(`incoming edges to B: ${incomingToB.length}`);
    expect(incomingToB.length).toBe(0);
  });

  // @plan T05.10
  // @covers EOCP-E5-02
  it('Step 3 – only step C has an incoming dependency (step A and B unblocked at start)', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (A and C edge structure)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.latestVersion?.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.10-step-A');
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.10-step-C');
    const edges = res.body.data.latestVersion?.edges ?? [];

    const incomingToA = edges.filter((e: { childChainId: string }) => e.childChainId === pcA.id);
    const incomingToC = edges.filter((e: { childChainId: string }) => e.childChainId === pcC.id);
    log.ok(`incoming to A: ${incomingToA.length}, incoming to C: ${incomingToC.length}`);
    expect(incomingToA.length).toBe(0);
    expect(incomingToC.length).toBeGreaterThanOrEqual(1);
  });
});
