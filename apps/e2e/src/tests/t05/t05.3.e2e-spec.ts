import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.3 — Declarative definition of task dependencies
// @covers EOCP-E5-03
//
// Description: Verifies that task dependencies are defined declaratively via the edges API and
//   that modifying an edge changes the stored configuration.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.3');

describe('T05.3 — Declarative definition of task dependencies', () => {
  let cookie: string;
  let chainId: string;
  let stepAId: string;
  let stepBId: string;
  let edgeId: string;
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
      .send({ name: `T05.3-declarative-${Date.now()}`, kind: 'Standard', comment: 'T05.3 declarative deps' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.3-step-A', 'T05.3-step-B']) {
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
    const pcs = chainRes.body.data.latestVersion?.processingChains ?? [];
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.3-step-A')?.id;
    stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.3-step-B')?.id;
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

  // @plan T05.3
  // @covers EOCP-E5-03
  it('Step 1 – dependency declared via POST /production-chain/:id/edges is accepted', async () => {
    log.step('Step 1 — POST edges (OnSuccess)');

    log.action('POST edges', { parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges', res.status, res.status < 300 ? { id: res.body.data?.id, dependencyMode: res.body.data?.dependencyMode } : res.body);
    expect([201, 200]).toContain(res.status);
    edgeId = res.body.data.id;
    expect(edgeId).toBeDefined();
    expect(res.body.data.dependencyMode).toBe('OnSuccess');
    log.ok(`edge created: ${edgeId}`);
  });

  // @plan T05.3
  // @covers EOCP-E5-03
  it('Step 2 – chain task executes and structure reflects declared dependency', async () => {
    log.step('Step 2 — POST /task + verify edge in chain');

    log.action('POST /task', { productionChainId: chainId });
    const taskRes = await request(API)
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
        comment: 'T05.3 – declarative dependency chain',
      });
    log.http('POST', '/task', taskRes.status, taskRes.status === 201 ? { id: taskRes.body.data.id } : taskRes.body);
    expect(taskRes.status).toBe(201);
    createdTaskIds.push(taskRes.body.data.id);

    log.action(`GET /production-chain/${chainId}`);
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, chainRes.status);
    expect(chainRes.status).toBe(200);

    const edges = chainRes.body.data.latestVersion?.edges ?? [];
    const hasOnSuccess = edges.some((e: { dependencyMode: string }) => e.dependencyMode === 'OnSuccess');
    log.ok(`OnSuccess edge in structure: ${hasOnSuccess}`);
    expect(hasOnSuccess).toBe(true);
  });

  // @plan T05.3
  // @covers EOCP-E5-03
  it('Step 3 – modifying dependency mode via PATCH changes declared configuration', async () => {
    log.step(`Step 3 — PATCH /production-chain/${chainId}/edges/${edgeId}`);

    log.action('PATCH edge', { dependencyMode: 'OnFailure' });
    const res = await request(API)
      .patch(`/production-chain/${chainId}/edges/${edgeId}`)
      .set('Cookie', cookie)
      .send({ dependencyMode: 'OnFailure' });
    log.http('PATCH', `edges/${edgeId}`, res.status, { dependencyMode: res.body.data?.dependencyMode });
    expect(res.status).toBe(200);
    expect(res.body.data.dependencyMode).toBe('OnFailure');
    log.ok('edge updated to OnFailure');
  });
});
