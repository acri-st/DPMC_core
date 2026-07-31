import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.9 — Combination of multiple dependency conditions
// @covers EOCP-E5-04
//
// Description: Verifies support for composite dependency conditions: step C has two incoming edges
//   from A and B (AND-like semantics), with different modes (OnSuccess and OnCompletion).
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.9');

describe('T05.9 — Combination of multiple dependency conditions', () => {
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

    log.action('POST /production-chain (3-step multi-dep)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.9-multi-dep-${Date.now()}`, kind: 'Standard', comment: 'T05.9 multi deps' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.9-step-A', 'T05.9-step-B', 'T05.9-step-C']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }

    // Add A → C (OnSuccess)
    log.action('GET chain to resolve IDs');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.9-step-A');
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.9-step-C');

    log.action('POST edges A→C (OnSuccess)');
    const e1 = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcC.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→C)', e1.status);
    expect(e1.status).toBe(201);

    // Re-fetch for latest version IDs after version bump
    log.action('GET chain (re-fetch for latest version)');
    const chainRes2 = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes2.status).toBe(200);
    const pcs2 = chainRes2.body.data.processingChains ?? [];
    const pcB2 = pcs2.find((pc: { name: string }) => pc.name === 'T05.9-step-B');
    const pcC2 = pcs2.find((pc: { name: string }) => pc.name === 'T05.9-step-C');

    log.action('POST edges B→C (OnCompletion)');
    const e2 = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB2.id, childChainId: pcC2.id, dependencyMode: 'OnCompletion' });
    log.http('POST', 'edges (B→C)', e2.status);
    expect(e2.status).toBe(201);
    log.ok('chain with A→C (OnSuccess) + B→C (OnCompletion) ready');
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

  // @plan T05.9
  // @covers EOCP-E5-04
  it('Step 1 – step C has two incoming edges (both A and B must complete: AND semantics)', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (C has 2 incoming edges)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.9-step-C');
    expect(pcC).toBeDefined();

    const edges = res.body.data.edges ?? [];
    const incomingToC = edges.filter((e: { childChainId: string }) => e.childChainId === pcC.id);
    log.ok(`incoming edges to C: ${incomingToC.length}`);
    expect(incomingToC.length).toBeGreaterThanOrEqual(2);
  });

  // @plan T05.9
  // @covers EOCP-E5-04
  it('Step 2 – different dependency modes coexist (OnSuccess and OnCompletion on same target)', async () => {
    log.step(`Step 2 — GET /production-chain/${chainId} (modes check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const edges = res.body.data.edges ?? [];
    const modes = edges.map((e: { dependencyMode: string }) => e.dependencyMode);
    log.ok(`edge modes: ${modes.join(', ')}`);
    expect(modes).toContain('OnSuccess');
    expect(modes).toContain('OnCompletion');
  });

  // @plan T05.9
  // @covers EOCP-E5-04
  it('Step 3 – chain with multi-dependency graph is executable (task accepted)', async () => {
    log.step('Step 3 — POST /task (multi-dep chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.9 – multi-dependency chain',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });
});
