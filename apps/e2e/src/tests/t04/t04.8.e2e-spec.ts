import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.8 — Failure handling in linear chains
// @covers EOCP-E4-01
//
// Description: Verifies the structural contract for linear chains: two processing steps exist,
//   a task referencing the chain carries the chain ref, and the task appears in the task list.
//   Runtime failure propagation requires a live worker.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.8');

describe('T04.8 — Failure handling in linear chains', () => {
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

    log.action('POST /production-chain (failure linear)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.8-failure-linear-${Date.now()}`, kind: 'Standard', comment: 'T04.8 failure handling' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T04.8-task-A', 'T04.8-task-B']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
      expect(pc.status).toBe(201);
    }
    log.ok('linear chain with two steps ready');
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

  // @plan T04.8
  // @covers EOCP-E4-01
  it('Step 1 – chain has two processing steps (A and B) in the linear structure', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (two-step check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status);
    expect(res.status).toBe(200);

    const pcs = res.body.data.processingChains ?? [];
    log.ok(`processingChains: ${pcs.map((p: { name: string }) => p.name).join(', ')}`);
    expect(pcs.length).toBeGreaterThanOrEqual(2);
    expect(pcs.some((pc: { name: string }) => pc.name === 'T04.8-task-A')).toBe(true);
    expect(pcs.some((pc: { name: string }) => pc.name === 'T04.8-task-B')).toBe(true);
  });

  // @plan T04.8
  // @covers EOCP-E4-01
  it('Step 2 – chain task (simulating task A) is created and carries the chain reference', async () => {
    log.step('Step 2 — POST /task (simulating task A)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.8 – task A (first in linear chain)',
    };
    log.action('POST /task', { productionChainId: chainId });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.8
  // @covers EOCP-E4-01
  it('Step 3 – chain state is inspectable (task appears in list with chain reference)', async () => {
    log.step('Step 3 — GET /task (list, find chain task)');

    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);

    const items = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    const chainTask = items.find((t: { id: string }) => t.id === createdTaskIds[0]);
    log.ok(`task found in list: ${!!chainTask}, productionChainId: ${chainTask?.productionChainId}`);
    expect(chainTask).toBeDefined();
    expect(chainTask.productionChainId).toBe(chainId);
  });
});
