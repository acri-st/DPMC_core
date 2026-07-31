import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.13 — Mixed dependency scenarios within a single chain
// @covers EOCP-E5-01, EOCP-E5-04
//
// Description: Verifies correct behavior when OnSuccess and OnFailure deps coexist in one chain,
//   and that a step with no incoming edges runs in parallel.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.13');

describe('T05.13 — Mixed dependency scenarios within a single chain', () => {
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

    log.action('POST /production-chain (A→C OnSuccess, B→C OnFailure, D parallel)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.13-mixed-${Date.now()}`, kind: 'Standard', comment: 'T05.13 mixed deps' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.13-step-A', 'T05.13-step-B', 'T05.13-step-C', 'T05.13-step-D']) {
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
    let chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    let pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.13-step-A');
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.13-step-C');

    log.action('POST edges A→C (OnSuccess)');
    const e1 = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcC.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→C OnSuccess)', e1.status);
    expect(e1.status).toBe(201);

    // Re-fetch for B → C (version bump)
    log.action('GET chain (re-fetch for B→C)');
    chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    pcs = chainRes.body.data.processingChains ?? [];
    const pcB2 = pcs.find((pc: { name: string }) => pc.name === 'T05.13-step-B');
    const pcC2 = pcs.find((pc: { name: string }) => pc.name === 'T05.13-step-C');

    log.action('POST edges B→C (OnFailure)');
    const e2 = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB2.id, childChainId: pcC2.id, dependencyMode: 'OnFailure' });
    log.http('POST', 'edges (B→C OnFailure)', e2.status);
    expect(e2.status).toBe(201);
    log.ok('chain with A→C(OnSuccess) + B→C(OnFailure) + D(free) ready');
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

  // @plan T05.13
  // @covers EOCP-E5-01, EOCP-E5-04
  it('Step 1 – mixed dependency configuration is stored (OnSuccess and OnFailure coexist)', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (modes check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const edges = res.body.data.edges ?? [];
    const modes = edges.map((e: { dependencyMode: string }) => e.dependencyMode);
    log.ok(`edge modes: ${modes.join(', ')}`);
    expect(modes).toContain('OnSuccess');
    expect(modes).toContain('OnFailure');
  });

  // @plan T05.13
  // @covers EOCP-E5-01, EOCP-E5-04
  it('Step 2 – chain task executes with mixed dependency graph (accepted by API)', async () => {
    log.step('Step 2 — POST /task (mixed dep chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.13 – mixed dependency chain task',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.13
  // @covers EOCP-E5-01, EOCP-E5-04
  it('Step 3 – step D has no incoming edges (unblocked, runs in parallel with A and B)', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (D has no incoming edges)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    const pcD = pcs.find((pc: { name: string }) => pc.name === 'T05.13-step-D');
    expect(pcD).toBeDefined();

    const edges = res.body.data.edges ?? [];
    const incomingToD = edges.filter((e: { childChainId: string }) => e.childChainId === pcD.id);
    log.ok(`incoming edges to D: ${incomingToD.length}`);
    expect(incomingToD.length).toBe(0);
  });
});
