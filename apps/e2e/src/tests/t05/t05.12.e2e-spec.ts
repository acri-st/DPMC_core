import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.12 — Exclusion of hard-coded dependency logic
// @covers EOCP-E5-03
//
// Description: Verifies that dependency behavior is fully configurable via the API: edges can be
//   viewed, modified, deleted and recreated with a different mode.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.12');

describe('T05.12 — Exclusion of hard-coded dependency logic', () => {
  let cookie: string;
  let chainId: string;
  let edgeId: string;

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
      .send({ name: `T05.12-configurable-${Date.now()}`, kind: 'Standard', comment: 'T05.12 configurable deps' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.12-step-A', 'T05.12-step-B']) {
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
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.12-step-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.12-step-B');

    log.action('POST edges A→B (OnSuccess)');
    const edgeRes = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcB.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→B)', edgeRes.status, edgeRes.status === 201 ? { id: edgeRes.body.data.id } : edgeRes.body);
    expect(edgeRes.status).toBe(201);
    edgeId = edgeRes.body.data.id;
    log.ok(`edge created: ${edgeId}`);
  });

  afterAll(async () => {
    if (chainId) {
      log.action(`afterAll — deleting chain ${chainId}`);
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T05.12
  // @covers EOCP-E5-03
  it('Step 1 – dependency configuration is visible in GET /production-chain/:id', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (edge visible)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const edges = res.body.data.edges ?? [];
    const edge = edges.find((e: { id: string }) => e.id === edgeId);
    log.ok(`edge found: ${!!edge}, dependencyMode: ${edge?.dependencyMode}`);
    expect(edges.length).toBeGreaterThan(0);
    expect(edge).toBeDefined();
    expect(edge.dependencyMode).toBe('OnSuccess');
  });

  // @plan T05.12
  // @covers EOCP-E5-03
  it('Step 2 – modifying dependency mode via PATCH changes the stored configuration', async () => {
    log.step(`Step 2 — PATCH edges/${edgeId} (OnSuccess → OnCompletion)`);

    log.action(`PATCH edge ${edgeId}`, { dependencyMode: 'OnCompletion' });
    const res = await request(API)
      .patch(`/production-chain/${chainId}/edges/${edgeId}`)
      .set('Cookie', cookie)
      .send({ dependencyMode: 'OnCompletion' });
    log.http('PATCH', `edges/${edgeId}`, res.status, { dependencyMode: res.body.data?.dependencyMode });
    expect(res.status).toBe(200);
    expect(res.body.data.dependencyMode).toBe('OnCompletion');
    log.ok('edge updated to OnCompletion');
  });

  // @plan T05.12
  // @covers EOCP-E5-03
  it('Step 3 – dependency can be deleted and re-created with a different mode (fully configurable)', async () => {
    log.step(`Step 3 — DELETE edge/${edgeId} + re-create with OnFailure`);

    log.action(`DELETE edge ${edgeId}`);
    const del = await request(API).delete(`/production-chain/${chainId}/edges/${edgeId}`).set('Cookie', cookie);
    log.http('DELETE', `edges/${edgeId}`, del.status);
    expect(del.status).toBe(204);
    log.ok('edge deleted');

    // Re-fetch for latest processing chain IDs after version bump
    log.action('GET chain (re-fetch)');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, chainRes.status);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.12-step-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.12-step-B');
    expect(pcA).toBeDefined();
    expect(pcB).toBeDefined();

    log.action('POST edges A→B (OnFailure)');
    const newEdge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcB.id, dependencyMode: 'OnFailure' });
    log.http('POST', 'edges (OnFailure)', newEdge.status, newEdge.status < 300 ? { dependencyMode: newEdge.body.data?.dependencyMode } : newEdge.body);
    expect([201, 200]).toContain(newEdge.status);
    expect(newEdge.body.data.dependencyMode).toBe('OnFailure');
    log.ok('re-created with OnFailure');
  });
});
