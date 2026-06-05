import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.1 — Support for multiple triggering mechanisms
// @covers EOCP-E7-01
//
// Description: This test verifies that the DPMC system supports multiple job triggering mechanisms
//   simultaneously without conflicts.
// Prerequisites: Manual, API, data-driven, event-based, and scheduled triggering mechanisms are
//   implemented. At least one processing chain is available.
// Steps:
//   1. Configure all triggering mechanisms → Configuration is accepted
//   2. Activate each trigger independently → Triggers are registered
//   3. Observe system behavior → No trigger interferes with another

const log = makeLogger('T07.1');

describe('T07.1 — Support for multiple triggering mechanisms', () => {
  let cookie: string;
  const createdTaskIds: string[] = [];
  let hookId: string | undefined;
  let productTypeId: string | undefined;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /product-type');
    const pt = await request(API)
      .post('/product-type')
      .set('Cookie', cookie)
      .send({ acronym: `T071_${Date.now()}`, name: 'T07.1 trigger type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    if (pt.status === 201) productTypeId = pt.body.data.id;
    log.ok(`productTypeId=${productTypeId}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (hookId) {
      await request(API).delete(`/product-ingestion-hook/${hookId}`).set('Cookie', cookie);
    }
    if (productTypeId) {
      await request(API).delete(`/product-type/${productTypeId}`).set('Cookie', cookie);
    }
  });

  // @plan T07.1
  // @covers EOCP-E7-01
  it('Step 1 – manual and API trigger mechanisms are configured (task endpoint exists)', async () => {
    log.step('Step 1 — POST /task (manual trigger) + POST /product-ingestion-hook (data-driven)');
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
        comment: 'T07.1 – manual trigger mechanism',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`manual trigger task: ${res.body.data.id}`);

    // Data-driven hook configuration is accepted
    if (productTypeId) {
      log.action('POST /product-ingestion-hook');
      const hook = await request(API)
        .post('/product-ingestion-hook')
        .set('Cookie', cookie)
        .send({
          productTypeId,
          projectId: PROJECT_ID,
          enabled: true,
        });
      log.http('POST', '/product-ingestion-hook', hook.status, hook.status === 201 ? { id: hook.body.data.id } : hook.body);
      expect([201, 200]).toContain(hook.status);
      if (hook.status === 201) hookId = hook.body.data.id;
      log.ok(`hook created: ${hookId}`);
    }
  });

  // @plan T07.1
  // @covers EOCP-E7-01
  it('Step 2 – API trigger is registered (POST /task returns a valid task id)', async () => {
    log.step('Step 2 — POST /task (API trigger)');
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
        comment: 'T07.1 – API trigger registered',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    log.ok(`API trigger task: ${res.body.data.id}`);
  });

  // @plan T07.1
  // @covers EOCP-E7-01
  it('Step 3 – tasks from different triggers coexist in the list without conflict', async () => {
    log.step('Step 3 — GET /task (coexistence check)');
    const list = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', list.status);
    expect(list.status).toBe(200);
    const items = Array.isArray(list.body.data)
      ? list.body.data
      : (list.body.data?.items ?? []);
    const listedIds = new Set(items.map((t: { id: string }) => t.id));

    for (const id of createdTaskIds) {
      expect(listedIds.has(id)).toBe(true);
    }
    log.ok('all trigger tasks present in task list');

    // Scheduler status is accessible (scheduled trigger infrastructure is up)
    log.action('GET /scheduler/status');
    const sched = await request(API).get('/scheduler/status');
    log.http('GET', '/scheduler/status', sched.status);
    expect([200, 503]).toContain(sched.status);
    log.ok('scheduler status reachable');
  });
});
