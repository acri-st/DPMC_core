import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSING_SCRIPT_ID } from './_shared';

// @plan T04.11 — Negative conditions preventing chain execution
// @covers EOCP-E4-05, EOCP-E4-06
//
// Description: Verifies that tasks with negative execution parameters are accepted (API-level
//   contract), a deleted chain reference is rejected, and error responses are structured.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.11');

describe('T04.11 — Negative conditions preventing chain execution', () => {
  let cookie: string;
  let inactiveChainId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /production-chain (inactive chain)');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.11-inactive-chain-${Date.now()}`, kind: 'Standard', comment: 'T04.11 inactive' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    inactiveChainId = chain.body.data.id;

    log.action('POST processing-chain (blocked-step)');
    const pc = await request(API)
      .post(`/production-chain/${inactiveChainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.11-blocked-step' });
    log.http('POST', 'processing-chains', pc.status, pc.status === 201 ? { id: pc.body.data?.id } : pc.body);
    expect(pc.status).toBe(201);
    log.ok('inactive chain ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (inactiveChainId) {
      log.action(`afterAll — deleting chain ${inactiveChainId}`);
      await request(API).delete(`/production-chain/${inactiveChainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T04.11
  // @covers EOCP-E4-05, EOCP-E4-06
  it('Step 1 – production chain with configuration indicating skip condition is accepted', async () => {
    log.step('Step 1 — POST /task (negative execution parameters)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: inactiveChainId,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      parameters: { skipExecution: true, conditionMet: false },
      comment: 'T04.11 – task with false execution condition',
    };
    log.action('POST /task', { parameters: payload.parameters });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (negative params)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.parameters).toBeDefined();
    log.ok(`task with skip params created: ${res.body.data.id}`);
  });

  // @plan T04.11
  // @covers EOCP-E4-05, EOCP-E4-06
  it('Step 2 – attempting to create a task for a deleted production chain is rejected', async () => {
    log.step('Step 2 — create+delete temp chain, then POST /task referencing it');

    log.action('POST /production-chain (temp)');
    const temp = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T04.11-temp-${Date.now()}`, kind: 'Standard' });
    log.http('POST', '/production-chain (temp)', temp.status, temp.status === 201 ? { id: temp.body.data.id } : temp.body);
    expect(temp.status).toBe(201);
    const tempId = temp.body.data.id;

    log.action(`DELETE /production-chain/${tempId}`);
    await request(API).delete(`/production-chain/${tempId}`).set('Cookie', cookie);
    log.ok(`temp chain ${tempId} deleted`);

    log.action('POST /task (deleted chain ref)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Chain',
        productionChainId: tempId,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T04.11 – deleted chain reference',
      });
    log.http('POST', '/task (deleted chain)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
    log.ok(`deleted chain reference correctly rejected (${res.status})`);
  });

  // @plan T04.11
  // @covers EOCP-E4-05, EOCP-E4-06
  it('Step 3 – error response for invalid chain reference is structured (clear explanation)', async () => {
    log.step('Step 3 — POST /task (nil chain UUID, check error shape)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Chain',
      productionChainId: 0,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.11 – non-existent chain',
    };
    log.action('POST /task', { productionChainId: 0 });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (nil chain)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = res.body as Record<string, unknown>;
    const hasErrorField =
      body.message !== undefined ||
      body.error !== undefined ||
      body.errors !== undefined ||
      body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok('error response is structured, no raw stack trace');
  });
});
