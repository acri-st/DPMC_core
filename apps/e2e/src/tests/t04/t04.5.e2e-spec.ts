import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.5 — Conditional execution of chains based on parameters
// @covers EOCP-E4-05
//
// Description: Verifies that chains accept configuration and that tasks with varying parameters
//   are both accepted at the API level. Runtime condition evaluation happens in the worker.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.5');

describe('T04.5 — Conditional execution of chains based on parameters', () => {
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

    log.action('POST /production-chain (with configuration)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({
        name: `T04.5-conditional-chain-${Date.now()}`,
        kind: 'Standard',
        comment: 'T04.5 conditional chain',
        configuration: { condition: 'inputDataAvailable', threshold: 10 },
      });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain (conditional-step)');
    const pc = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.5-conditional-step', configuration: { minInputSize: 10 } });
    log.http('POST', 'processing-chains', pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
    expect(pc.status).toBe(201);
    log.ok('chain with configuration ready');
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

  // @plan T04.5
  // @covers EOCP-E4-05
  it('Step 1 – chain with conditional configuration field is accepted and stored', async () => {
    log.step(`Step 1 — GET /production-chain/${chainId} (config check)`);

    const res = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, res.status, { configuration: res.body.data?.configuration });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(chainId);

    const config = res.body.data.configuration;
    log.ok(`configuration: ${JSON.stringify(config)}`);
    expect(config).toBeDefined();
    expect(config).not.toBeNull();
    expect(typeof config).toBe('object');
  });

  // @plan T04.5
  // @covers EOCP-E4-05
  it('Step 2 – chain task with parameters satisfying the condition is accepted', async () => {
    log.step('Step 2 — POST /task (condition satisfied)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      parameters: { inputDataAvailable: true, inputSize: 50 },
      comment: 'T04.5 – condition satisfied',
    };
    log.action('POST /task', { parameters: payload.parameters });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (condition satisfied)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.parameters).toBeDefined();
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T04.5
  // @covers EOCP-E4-05
  it('Step 3 – chain task with different parameters is also accepted at API level', async () => {
    log.step('Step 3 — POST /task (condition unsatisfied — API still accepts)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: chainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      parameters: { inputDataAvailable: false, inputSize: 0 },
      comment: 'T04.5 – condition unsatisfied',
    };
    log.action('POST /task', { parameters: payload.parameters });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (condition unsatisfied)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.id).not.toBe(createdTaskIds[0]);
    log.ok('both parameter variants accepted — runtime evaluation deferred to worker');
  });
});
