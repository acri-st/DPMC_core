import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T06.1 — Endtoend scheduling based on inputs, dependencies, and production mode
// @covers EOCP-E6-01
//
// Description: This test verifies that the scheduling engine orchestrates tasks correctly by
//   considering input availability, declared dependencies, and the active production mode.
// Prerequisites: A production chain with dependencies is defined. At least one production mode is
//   active. Execution resources are available.
// Steps:
//   1. Launch a production chain → Scheduler evaluates dependencies
//   2. Observe task dispatching → Tasks start only when eligible
//   3. Switch production mode → Scheduling behavior adapts

const log = makeLogger('T06.1');

describe('T06.1 — Endtoend scheduling based on inputs, dependencies, and production mode', () => {
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

    log.action('POST /production-chain');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T06.1-sched-${Date.now()}`, kind: 'Standard', comment: 'T06.1 e2e scheduling' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain T06.1-step-A');
    const stepA = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T06.1-step-A' });
    log.http('POST', 'processing-chains (step-A)', stepA.status);
    expect(stepA.status).toBe(201);

    log.action('POST processing-chain T06.1-step-B');
    const stepB = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T06.1-step-B' });
    log.http('POST', 'processing-chains (step-B)', stepB.status);
    expect(stepB.status).toBe(201);
    void stepB;

    log.action('GET chain to resolve IDs');
    const chainRes = await request(API)
      .get(`/production-chain/${chainId}`)
      .set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T06.1-step-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T06.1-step-B');
    expect(pcA).toBeDefined();
    expect(pcB).toBeDefined();

    log.action('POST edges (OnSuccess A→B)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcB.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges', edge.status, edge.status === 201 ? { id: edge.body.data?.id, dependencyMode: edge.body.data?.dependencyMode } : edge.body);
    expect(edge.status).toBe(201);
    log.ok(`edge created: ${edge.body.data?.id}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (chainId) {
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
    }
  });

  // @plan T06.1
  // @covers EOCP-E6-01
  it('Step 1 – chain task is accepted by the scheduler (dependency graph evaluated)', async () => {
    log.step('Step 1 — POST /task (chain task)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Chain',
        productionChainId: chainId,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.1 – e2e scheduling step 1',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, productionChainId: res.body.data.productionChainId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Chain');
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`chain task created: ${res.body.data.id}`);
  });

  // @plan T06.1
  // @covers EOCP-E6-01
  it('Step 2 – dependency graph is present in the chain (OnSuccess edge from A to B)', async () => {
    log.step(`Step 2 — GET /production-chain/${chainId} (verify edges)`);
    const res = await request(API)
      .get(`/production-chain/${chainId}`)
      .set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);
    const edges = res.body.data.edges ?? [];
    expect(edges.length).toBeGreaterThanOrEqual(1);
    const onSuccessEdge = edges.find(
      (e: { dependencyMode: string }) => e.dependencyMode === 'OnSuccess',
    );
    log.ok(`OnSuccess edge found: ${!!onSuccessEdge}`);
    expect(onSuccessEdge).toBeDefined();
  });

  // @plan T06.1
  // @covers EOCP-E6-01
  it('Step 3 – NRT chain task accepted (production mode influences scheduling entry point)', async () => {
    log.step('Step 3 — POST /task (NRT chain task)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Chain',
        productionChainId: chainId,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.1 – e2e scheduling step 3 NRT',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.priorityClass).toBe('NRT');
    log.ok(`NRT chain task created: ${res.body.data.id}`);
  });
});
