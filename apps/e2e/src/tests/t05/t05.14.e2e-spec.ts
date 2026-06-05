import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.14 — Automatic resumption after dependency resolution
// @covers EOCP-E5-05
//
// Description: Verifies that removing a blocking edge resolves the dependency (step B now has no
//   incoming edges), and that the chain is then immediately executable.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.14');

describe('T05.14 — Automatic resumption after dependency resolution', () => {
  let cookie: string;
  let chainId: string;
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
      .send({ name: `T05.14-resumption-${Date.now()}`, kind: 'Standard', comment: 'T05.14 auto resumption' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.14-blocker', 'T05.14-blocked']) {
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
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.14-blocker');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.14-blocked');

    log.action('POST edges blocker→blocked (OnSuccess)');
    const edgeRes = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcB.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (blocker→blocked)', edgeRes.status, edgeRes.status === 201 ? { id: edgeRes.body.data.id } : edgeRes.body);
    expect(edgeRes.status).toBe(201);
    edgeId = edgeRes.body.data.id;
    log.ok(`blocking edge created: ${edgeId}`);
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

  // @plan T05.14
  // @covers EOCP-E5-05
  it('Step 1 – chain with OnSuccess dependency is accepted (downstream structurally blocked)', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (blocking edge present)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const edges = res.body.data.latestVersion?.edges ?? [];
    const blocking = edges.find((e: { dependencyMode: string }) => e.dependencyMode === 'OnSuccess');
    log.ok(`blocking edge found: ${!!blocking}, id: ${blocking?.id}`);
    expect(blocking).toBeDefined();
    expect(blocking.id).toBe(edgeId);
  });

  // @plan T05.14
  // @covers EOCP-E5-05
  it('Step 2 – removing the blocking edge resolves the dependency (step B unblocked)', async () => {
    log.step(`Step 2 — DELETE edge/${edgeId} then verify step B has no incoming edges`);

    log.action(`DELETE edge ${edgeId}`);
    const del = await request(API).delete(`/production-chain/${chainId}/edges/${edgeId}`).set('Cookie', cookie);
    log.http('DELETE', `edges/${edgeId}`, del.status);
    expect(del.status).toBe(204);
    log.ok('blocking edge deleted');

    log.action(`GET /production-chain/${chainId}`);
    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.latestVersion?.processingChains ?? [];
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.14-blocked');
    expect(pcB).toBeDefined();

    const edges = res.body.data.latestVersion?.edges ?? [];
    const incomingToB = edges.filter((e: { childChainId: string }) => e.childChainId === pcB.id);
    log.ok(`incoming edges to 'blocked' after delete: ${incomingToB.length}`);
    expect(incomingToB.length).toBe(0);
  });

  // @plan T05.14
  // @covers EOCP-E5-05
  it('Step 3 – chain task starts normally after dependency is resolved (no longer blocked)', async () => {
    log.step('Step 3 — POST /task (after dependency resolved)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T05.14 – resumed after dependency resolved',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created after resolution: ${res.body.data.id}`);
  });
});
