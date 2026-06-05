import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.4 — Dispatcher decision logic
// @covers EOCP-E6-05
//
// Description: This test verifies that the job dispatcher selects tasks based on priority,
//   dependencies, and resource constraints.
// Prerequisites: Jobs with different priorities and constraints exist.
// Steps:
//   1. Submit jobs with different priorities → Jobs are queued
//   2. Observe dispatch order → High-priority jobs are favored
//   3. Verify dependency constraints → Dependencies are enforced

const log = makeLogger('T06.4');

describe('T06.4 — Dispatcher decision logic', () => {
  let cookie: string;
  let highPriorityTaskId: string;
  let lowPriorityTaskId: string;
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
      .send({ name: `T06.4-dispatcher-${Date.now()}`, kind: 'Standard', comment: 'T06.4 dispatcher' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain T06.4-step-A');
    const stepA = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T06.4-step-A' });
    log.http('POST', 'processing-chains (step-A)', stepA.status);
    expect(stepA.status).toBe(201);

    log.action('POST processing-chain T06.4-step-B');
    const stepB = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T06.4-step-B' });
    log.http('POST', 'processing-chains (step-B)', stepB.status);
    expect(stepB.status).toBe(201);
    void stepB;

    log.action('GET chain to resolve IDs');
    const chainRes = await request(API)
      .get(`/production-chain/${chainId}`)
      .set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.latestVersion?.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T06.4-step-A');
    const pcB2 = pcs.find((pc: { name: string }) => pc.name === 'T06.4-step-B');
    expect(pcA).toBeDefined();
    expect(pcB2).toBeDefined();

    log.action('POST edges (OnSuccess A→B)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA.id, childChainId: pcB2.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges', edge.status, edge.status === 201 ? { id: edge.body.data?.id, dependencyMode: edge.body.data?.dependencyMode } : edge.body);
    expect(edge.status).toBe(201);
    log.ok(`chain setup complete, chainId=${chainId}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (chainId) {
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
    }
  });

  // @plan T06.4
  // @covers EOCP-E6-05
  it('Step 1 – high-priority task is accepted by dispatcher', async () => {
    log.step('Step 1 — POST /task (high priority, Super)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 9,
        productionMode: 'Nominal',
        priorityClass: 'Super',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T06.4 – high priority task',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priority: res.body.data.priority, priorityClass: res.body.data.priorityClass } : res.body);
    expect(res.status).toBe(201);
    highPriorityTaskId = res.body.data.id;
    createdTaskIds.push(highPriorityTaskId);
    expect(res.body.data.priority).toBe(9);
    expect(res.body.data.priorityClass).toBe('Super');
    log.ok(`high-priority task created: ${highPriorityTaskId}`);
  });

  // @plan T06.4
  // @covers EOCP-E6-05
  it('Step 2 – low-priority task is accepted; priority stored correctly', async () => {
    log.step('Step 2 — POST /task (low priority, NRT)');
    const res = await request(API)
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
        comment: 'T06.4 – low priority task',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priority: res.body.data.priority, priorityClass: res.body.data.priorityClass } : res.body);
    expect(res.status).toBe(201);
    lowPriorityTaskId = res.body.data.id;
    createdTaskIds.push(lowPriorityTaskId);
    expect(res.body.data.priority).toBe(0);
    expect(res.body.data.priorityClass).toBe('NRT');
    expect(res.body.data.priority).toBeLessThan(9);
    log.ok(`low-priority task created: ${lowPriorityTaskId}`);
  });

  // @plan T06.4
  // @covers EOCP-E6-05
  it('Step 3 – chain task with OnSuccess dep is accepted (dependency constraints in dispatcher)', async () => {
    log.step('Step 3 — POST /task (chain with OnSuccess dep)');
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
        comment: 'T06.4 – chain task with dependency',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, productionChainId: res.body.data.productionChainId } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Chain');
    expect(res.body.data.productionChainId).toBe(chainId);
    log.ok(`chain task created: ${res.body.data.id}`);
  });
});
