import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.7 — Pre-deployment validation of dependency graphs
// @covers EOCP-E5-03
//
// Description: Verifies that valid acyclic graphs are accepted, cycle-closing edges are rejected,
//   and the chain remains executable after the cycle was blocked.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.7');

describe('T05.7 — Pre-deployment validation of dependency graphs', () => {
  let cookie: string;
  let validChainId: string;
  let invalidChainId: string;
  let validEdgeId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    const ts = Date.now();

    // Valid chain: A → B (acyclic)
    log.action('POST /production-chain (valid graph)');
    const validChain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.7-valid-${ts}`, kind: 'Standard', comment: 'T05.7 valid graph' });
    log.http('POST', '/production-chain (valid)', validChain.status, validChain.status === 201 ? { id: validChain.body.data.id } : validChain.body);
    expect(validChain.status).toBe(201);
    validChainId = validChain.body.data.id;

    for (const name of ['T05.7-valid-A', 'T05.7-valid-B']) {
      const pc = await request(API)
        .post(`/production-chain/${validChainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }
    const validChainRes = await request(API).get(`/production-chain/${validChainId}`).set('Cookie', cookie);
    expect(validChainRes.status).toBe(200);
    const validPcs = validChainRes.body.data.processingChains ?? [];
    const validA = validPcs.find((pc: { name: string }) => pc.name === 'T05.7-valid-A');
    const validB = validPcs.find((pc: { name: string }) => pc.name === 'T05.7-valid-B');
    expect(validA).toBeDefined();
    expect(validB).toBeDefined();

    log.action('POST edges A→B (valid acyclic)');
    const edgeValid = await request(API)
      .post(`/production-chain/${validChainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: validA.id, childChainId: validB.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (valid A→B)', edgeValid.status, edgeValid.status === 201 ? { id: edgeValid.body.data?.id } : edgeValid.body);
    expect(edgeValid.status).toBe(201);
    validEdgeId = edgeValid.body.data.id;
    log.ok(`valid chain ready: ${validChainId}, edgeId: ${validEdgeId}`);

    // Invalid chain: will attempt cycle A → B → A
    log.action('POST /production-chain (invalid graph)');
    const invalidChain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.7-invalid-${ts}`, kind: 'Standard', comment: 'T05.7 invalid graph' });
    log.http('POST', '/production-chain (invalid)', invalidChain.status, invalidChain.status === 201 ? { id: invalidChain.body.data.id } : invalidChain.body);
    expect(invalidChain.status).toBe(201);
    invalidChainId = invalidChain.body.data.id;

    for (const name of ['T05.7-inv-A', 'T05.7-inv-B']) {
      const pc = await request(API)
        .post(`/production-chain/${invalidChainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }
    const invChainRes = await request(API).get(`/production-chain/${invalidChainId}`).set('Cookie', cookie);
    expect(invChainRes.status).toBe(200);
    const invPcs = invChainRes.body.data.processingChains ?? [];
    const invA = invPcs.find((pc: { name: string }) => pc.name === 'T05.7-inv-A');
    const invB = invPcs.find((pc: { name: string }) => pc.name === 'T05.7-inv-B');
    expect(invA).toBeDefined();
    expect(invB).toBeDefined();

    log.action('POST edges invA→invB (base edge before cycle attempt)');
    const edgeInv = await request(API)
      .post(`/production-chain/${invalidChainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: invA.id, childChainId: invB.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (inv A→B)', edgeInv.status, edgeInv.status === 201 ? { id: edgeInv.body.data?.id } : edgeInv.body);
    expect(edgeInv.status).toBe(201);
    log.ok(`invalid chain (with A→B) ready: ${invalidChainId}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    for (const id of [validChainId, invalidChainId]) {
      if (id) await request(API).delete(`/production-chain/${id}`).set('Cookie', cookie);
    }
    log.ok('afterAll cleanup done');
  });

  // @plan T05.7
  // @covers EOCP-E5-03
  it('Step 1 – valid acyclic graph is accepted: edge stored with correct parent/child/mode', async () => {
    log.step(`Step 1 — GET /production-chain/${validChainId} then POST /task`);

    const chainRes = await request(API).get(`/production-chain/${validChainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${validChainId}`, chainRes.status);
    expect(chainRes.status).toBe(200);

    const edges = chainRes.body.data.edges ?? [];
    expect(edges).toHaveLength(1);
    const edge = edges[0];
    log.ok(`edge: id=${edge.id}, mode=${edge.dependencyMode}, parent=${edge.parentChainId}, child=${edge.childChainId}`);
    expect(edge.id).toBe(validEdgeId);
    expect(edge.dependencyMode).toBe('OnSuccess');
    expect(edge.parentChainId).not.toBe(edge.childChainId);

    // Verify direction by name
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.7-valid-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.7-valid-B');
    expect(edge.parentChainId).toBe(pcA.id);
    expect(edge.childChainId).toBe(pcB.id);
    log.ok('acyclic edge direction confirmed: A→B');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: validChainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.7 – valid dependency graph',
    };
    log.action('POST /task', { productionChainId: validChainId });
    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (valid)', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, productionChainId: res.body.data.productionChainId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Chain');
    expect(res.body.data.productionChainId).toBe(validChainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.7
  // @covers EOCP-E5-03
  it('Step 2 – closing a cycle (B→A on chain with A→B) is rejected with 4xx and error message', async () => {
    log.step('Step 2 — POST edges B→A (cycle closing)');

    const chainRes = await request(API).get(`/production-chain/${invalidChainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${invalidChainId}`, chainRes.status);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.7-inv-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.7-inv-B');
    expect(pcA).toBeDefined();
    expect(pcB).toBeDefined();

    log.action('POST edges B→A (cycle)', { parentChainId: pcB.id, childChainId: pcA.id });
    const res = await request(API)
      .post(`/production-chain/${invalidChainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB.id, childChainId: pcA.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (B→A cycle)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    // Error body must carry a meaningful message mentioning cycle
    const body = res.body as Record<string, unknown>;
    const message = ((body.error as { message?: string } | undefined)?.message ?? (body.message as string | undefined) ?? '');
    log.ok(`cycle rejected (${res.status}): "${message}"`);
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
    expect(message.toLowerCase()).toMatch(/cycle/);

    // Graph must be unchanged: still exactly 1 edge (A→B), B→A must not have been stored
    const afterRes = await request(API).get(`/production-chain/${invalidChainId}`).set('Cookie', cookie);
    expect(afterRes.status).toBe(200);
    const edgesAfter = afterRes.body.data.edges ?? [];
    expect(edgesAfter).toHaveLength(1);
    expect(edgesAfter[0].parentChainId).not.toBe(pcB.id);
    log.ok('graph unchanged after rejected cycle: still 1 edge');
  });

  // @plan T05.7
  // @covers EOCP-E5-03
  it('Step 3 – chain with only the valid A→B edge remains executable (task accepted after blocked cycle)', async () => {
    log.step('Step 3 — POST /task (invalid chain after blocked cycle)');

    const chainRes = await request(API).get(`/production-chain/${invalidChainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const edges = chainRes.body.data.edges ?? [];
    log.ok(`edges present: ${edges.length}, mode: ${edges[0]?.dependencyMode}`);
    expect(edges).toHaveLength(1);
    expect(edges[0].dependencyMode).toBe('OnSuccess');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: invalidChainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.7 – chain after blocked cycle attempt',
    };
    log.action('POST /task', { productionChainId: invalidChainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (after blocked cycle)', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, productionChainId: res.body.data.productionChainId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Chain');
    expect(res.body.data.productionChainId).toBe(invalidChainId);
    log.ok(`chain still executable after blocked cycle: ${res.body.data.id}`);
  });
});
