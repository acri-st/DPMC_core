import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.9 — Implicit chain logic absence for standalone jobs
// @covers EOCP-E4-02
//
// Description: Verifies that standalone jobs are not affected by chain logic and coexist with
//   chain tasks independently.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.9');

describe('T04.9 — Implicit chain logic absence for standalone jobs', () => {
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

    log.action('POST /production-chain (coexist chain)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.9-coexist-chain-${Date.now()}`, kind: 'Standard' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain (for chain task)');
    const pc = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.9-step' });
    log.http('POST', 'processing-chains', pc.status);
    expect(pc.status).toBe(201);
    log.ok('coexist chain ready');
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

  // @plan T04.9
  // @covers EOCP-E4-02
  it('Step 1 – standalone task is accepted alongside a chain task', async () => {
    log.step('Step 1 — POST /task x2 (chain + standalone)');

    log.action('POST /task (kind=Chain)');
    const chainTask = await request(API)
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
        comment: 'T04.9 – chain task',
      });
    log.http('POST', '/task (chain)', chainTask.status, chainTask.status === 201 ? { id: chainTask.body.data.id } : chainTask.body);
    expect(chainTask.status).toBe(201);
    createdTaskIds.push(chainTask.body.data.id);

    log.action('POST /task (kind=Standalone)');
    const standaloneTask = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T04.9 – standalone task',
      });
    log.http('POST', '/task (standalone)', standaloneTask.status, standaloneTask.status === 201 ? { id: standaloneTask.body.data.id } : standaloneTask.body);
    expect(standaloneTask.status).toBe(201);
    createdTaskIds.push(standaloneTask.body.data.id);
    log.ok('chain and standalone tasks created');
  });

  // @plan T04.9
  // @covers EOCP-E4-02
  it('Step 2 – standalone task has no productionChainId (no chain evaluation)', async () => {
    const standaloneId = createdTaskIds[1];
    log.step(`Step 2 — GET /task/${standaloneId} (chain check)`);

    const res = await request(API).get(`/task/${standaloneId}`).set('Cookie', cookie);
    log.http('GET', `/task/${standaloneId}`, res.status, { productionChainId: res.body.data?.productionChainId, kind: res.body.data?.kind });
    expect(res.status).toBe(200);
    expect(res.body.data.productionChainId).toBeNull();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok('standalone has no chain — confirmed');
  });

  // @plan T04.9
  // @covers EOCP-E4-02
  it('Step 3 – standalone and chain tasks coexist independently in the task list', async () => {
    log.step('Step 3 — GET /task (both tasks in list)');

    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);

    const items = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    const ids = new Set(items.map((t: { id: string }) => t.id));
    const [chainTaskId, standaloneTaskId] = createdTaskIds;

    log.ok(`chain task in list: ${ids.has(chainTaskId)}, standalone in list: ${ids.has(standaloneTaskId)}`);
    expect(ids.has(chainTaskId)).toBe(true);
    expect(ids.has(standaloneTaskId)).toBe(true);
    expect(chainTaskId).not.toBe(standaloneTaskId);
  });
});
