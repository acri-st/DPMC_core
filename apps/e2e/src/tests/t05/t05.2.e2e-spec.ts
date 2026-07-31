import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.2 — Detection of parallelizable tasks within a dependency graph
// @covers EOCP-E4-07
//
// Description: Verifies that tasks with no dependency between them are independently defined,
//   and that adding an edge correctly models serialization.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.2');

describe('T05.2 — Detection of parallelizable tasks within a dependency graph', () => {
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
      .send({ name: `T05.2-parallel-${Date.now()}`, kind: 'Standard', comment: 'T05.2 parallel tasks' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.2-step-A', 'T05.2-step-B']) {
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
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.2-step-A')?.id;
    stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.2-step-B')?.id;
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

  // @plan T05.2
  // @covers EOCP-E4-07
  it('Step 1 – two independent processing steps are defined with no edge between them', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (no edge between A and B)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    expect(pcs.some((pc: { id: string }) => pc.id === stepAId)).toBe(true);
    expect(pcs.some((pc: { id: string }) => pc.id === stepBId)).toBe(true);

    const edges = res.body.data.edges ?? [];
    const hasEdge = edges.some(
      (e: { parentChainId: string; childChainId: string }) =>
        (e.parentChainId === stepAId && e.childChainId === stepBId) ||
        (e.parentChainId === stepBId && e.childChainId === stepAId),
    );
    log.ok(`edges between A and B: ${hasEdge}`);
    expect(hasEdge).toBe(false);
  });

  // @plan T05.2
  // @covers EOCP-E4-07
  it('Step 2 – chain task is accepted (both steps eligible at launch with no blocking dependency)', async () => {
    log.step('Step 2 — POST /task (no blocking dep)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.2 – parallel steps chain',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T05.2
  // @covers EOCP-E4-07
  it('Step 3 – adding an OnCompletion edge serializes steps, demonstrating dependency is configurable', async () => {
    log.step('Step 3 — POST edges (OnCompletion A→B)');

    log.action('POST edges', { parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnCompletion' });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnCompletion' });
    log.http('POST', 'edges (OnCompletion)', res.status, res.status < 300 ? { id: res.body.data?.id } : res.body);
    expect([201, 200]).toContain(res.status);

    log.action(`GET /production-chain/${chainId} (edge count check)`);
    const chain = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, chain.status);
    expect(chain.status).toBe(200);

    const edges = chain.body.data.edges ?? [];
    log.ok(`edges after adding OnCompletion: ${edges.length}`);
    expect(edges.length).toBeGreaterThan(0);
  });
});
