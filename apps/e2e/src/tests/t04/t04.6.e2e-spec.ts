import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.6 — Failure propagation in embedded chains
// @covers EOCP-E4-01
//
// Description: Verifies the structural contract: a task with a valid chain reference is created,
//   a task with a non-existent chain reference is rejected, and the chain structure is inspectable.
//   Runtime failure propagation requires a live worker.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.6');

describe('T04.6 — Failure propagation in embedded chains', () => {
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

    log.action('POST /production-chain (failure chain)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.6-failure-chain-${Date.now()}`, kind: 'Standard', comment: 'T04.6 failure chain' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain (failing-step)');
    const pc = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.6-failing-step' });
    log.http('POST', 'processing-chains', pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
    expect(pc.status).toBe(201);
    log.ok('chain ready for failure scenario');
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

  // @plan T04.6
  // @covers EOCP-E4-01
  it('Step 1 – chain task is created for failure scenario verification', async () => {
    log.step('Step 1 — POST /task (valid chain ref)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.6 – failure propagation test',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (valid chain)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.6
  // @covers EOCP-E4-01
  it('Step 2 – chain task referencing a non-existent productionChainId is rejected', async () => {
    log.step('Step 2 — POST /task (non-existent chain ref)');

    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: nonExistentId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.6 – invalid chain reference',
    };
    log.action('POST /task', { productionChainId: nonExistentId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (invalid chain)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
    log.ok(`non-existent chain correctly rejected (${res.status})`);
  });

  // @plan T04.6
  // @covers EOCP-E4-01
  it('Step 3 – chain structure remains accessible after task creation (for error inspection)', async () => {
    log.step(`Step 3 — GET /production-chain/${chainId} (structure accessible)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.latestVersion?.processingChains ?? [];
    log.ok(`processingChains: ${pcs.map((p: { name: string }) => p.name).join(', ')}`);
    expect(pcs.length).toBeGreaterThanOrEqual(1);
    expect(pcs[0].name).toBe('T04.6-failing-step');
  });
});
