import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.6 — Runtime enforcement of dependency rules
// @covers EOCP-E5-05
//
// Description: Verifies that an OnSuccess dependency is structurally enforced, and that the
//   dependency mode can be dynamically changed (OnFailure), demonstrating runtime configurability.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.6');

describe('T05.6 — Runtime enforcement of dependency rules', () => {
  let cookie: string;
  let chainId: string;
  let edgeId: string;
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
      .send({ name: `T05.6-runtime-${Date.now()}`, kind: 'Standard', comment: 'T05.6 runtime enforcement' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.6-upstream', 'T05.6-downstream']) {
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
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.6-upstream')?.id;
    stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.6-downstream')?.id;
    expect(stepAId).toBeDefined();
    expect(stepBId).toBeDefined();
    log.ok(`stepA=${stepAId}, stepB=${stepBId}`);

    log.action('POST edges (OnSuccess upstream→downstream)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges', edge.status, edge.status === 201 ? { id: edge.body.data?.id, dependencyMode: edge.body.data?.dependencyMode } : edge.body);
    expect(edge.status).toBe(201);
    edgeId = edge.body.data.id;
    log.ok(`OnSuccess edge created: ${edgeId}`);
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

  // @plan T05.6
  // @covers EOCP-E5-05
  it('Step 1 – chain with OnSuccess dependency is accepted and task created with correct chain reference', async () => {
    log.step('Step 1 — POST /task (chain with OnSuccess dep)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.6 – runtime dependency enforcement',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, productionChainId: res.body.data.productionChainId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Chain');
    expect(res.body.data.productionChainId).toBe(chainId);
    expect(res.body.data.productionMode).toBe('Nominal');
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.6
  // @covers EOCP-E5-05
  it('Step 2 – chain structure shows exact edge: upstream→downstream, OnSuccess, correct IDs', async () => {
    log.step(`Step 2 — GET /production-chain/${chainId} (edge structure)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const version = res.body.data.latestVersion;
    expect(version).toBeDefined();
    const edges = version?.edges ?? [];
    expect(edges).toHaveLength(1);

    const edge = edges.find((e: { id: string }) => e.id === edgeId);
    log.ok(`edge found by id: ${!!edge}, dependencyMode=${edge?.dependencyMode}, parent=${edge?.parentChainId}, child=${edge?.childChainId}`);
    expect(edge).toBeDefined();
    expect(edge.dependencyMode).toBe('OnSuccess');
    expect(edge.parentChainId).not.toBe(edge.childChainId);

    // Verify direction: upstream is parent, downstream is child (by name resolution)
    const pcs = version?.processingChains ?? [];
    const upstreamInNewVersion = pcs.find((pc: { name: string }) => pc.name === 'T05.6-upstream');
    const downstreamInNewVersion = pcs.find((pc: { name: string }) => pc.name === 'T05.6-downstream');
    expect(upstreamInNewVersion).toBeDefined();
    expect(downstreamInNewVersion).toBeDefined();
    expect(edge.parentChainId).toBe(upstreamInNewVersion.id);
    expect(edge.childChainId).toBe(downstreamInNewVersion.id);
    log.ok('edge direction confirmed: upstream→downstream');
  });

  // @plan T05.6
  // @covers EOCP-E5-05
  it('Step 3 – replacing OnSuccess with OnFailure returns updated edge with correct mode and same IDs', async () => {
    log.step(`Step 3 — PATCH edge ${edgeId} (OnSuccess → OnFailure)`);

    // Re-fetch latest edge id after potential version bump from beforeAll edge POST
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const edges = chainRes.body.data.latestVersion?.edges ?? [];
    const currentEdge = edges[0];
    expect(currentEdge).toBeDefined();
    const currentEdgeId: string = currentEdge.id;
    log.ok(`current edge id: ${currentEdgeId}, mode: ${currentEdge.dependencyMode}`);

    log.action(`PATCH edge ${currentEdgeId}`, { dependencyMode: 'OnFailure' });
    const updated = await request(API)
      .patch(`/production-chain/${chainId}/edges/${currentEdgeId}`)
      .set('Cookie', cookie)
      .send({ dependencyMode: 'OnFailure' });
    log.http('PATCH', `edges/${currentEdgeId}`, updated.status, updated.status === 200 ? { id: updated.body.data?.id, dependencyMode: updated.body.data?.dependencyMode, parentChainId: updated.body.data?.parentChainId, childChainId: updated.body.data?.childChainId } : updated.body);
    expect(updated.status).toBe(200);
    expect(updated.body.data.id).toBe(currentEdgeId);
    expect(updated.body.data.dependencyMode).toBe('OnFailure');
    // Chaining links must not change when only mode is patched
    expect(updated.body.data.parentChainId).toBe(currentEdge.parentChainId);
    expect(updated.body.data.childChainId).toBe(currentEdge.childChainId);
    log.ok('dependency mode updated to OnFailure, IDs unchanged');
  });
});
