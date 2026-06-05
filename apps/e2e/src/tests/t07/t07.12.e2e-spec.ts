import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.12 — Resilience to event loss
// @covers EOCP-E7-05
//
// Description: This test verifies that temporary event delivery issues do not lead to permanent
//   job loss. An event replay/retry mechanism is not yet implemented. This test verifies the
//   resilience contract available at the API layer: (1) the catalog retains ingested products
//   regardless of hook dispatch failures, (2) the ingestion hook can be re-enabled after
//   being disabled (simulates restore), and (3) tasks created after a disruption are accepted.
// Prerequisites: Event retry or replay mechanism exists.
// Steps:
//   1. Interrupt event delivery (disable hook) → Ingestion still succeeds; hook is paused
//   2. Restore event delivery (re-enable hook) → Hook is active again
//   3. Observe job creation → Subsequent API-triggered jobs succeed

const log = makeLogger('T07.12');

describe('T07.12 — Resilience to event loss', () => {
  let cookie: string;
  let productTypeId: string;
  let hookId: string | undefined;
  const productIds: string[] = [];
  const createdTaskIds: string[] = [];

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
      .send({ acronym: `T0712_${Date.now()}`, name: 'T07.12 resilience type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;

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
    expect(hook.status).toBe(201);
    hookId = hook.body.data.id;
    log.ok(`hook created: ${hookId}`);
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    for (const id of productIds) {
      await request(API).delete(`/product/${id}`).set('Cookie', cookie);
    }
    if (hookId) {
      await request(API).delete(`/product-ingestion-hook/${hookId}`).set('Cookie', cookie);
    }
    if (productTypeId) {
      await request(API).delete(`/product-type/${productTypeId}`).set('Cookie', cookie);
    }
  });

  // @plan T07.12
  // @covers EOCP-E7-05
  it('Step 1 – disabling the hook (simulating event loss) does not affect catalog ingestion', async () => {
    log.step('Step 1 — PATCH /product-ingestion-hook (disable) + POST /product');
    const patch = await request(API)
      .patch(`/product-ingestion-hook/${hookId}`)
      .set('Cookie', cookie)
      .send({ enabled: false });
    log.http('PATCH', `/product-ingestion-hook/${hookId}`, patch.status, patch.status === 200 ? { enabled: patch.body.data?.enabled } : patch.body);
    expect(patch.status).toBe(200);

    log.action('POST /product (during hook-disabled window)');
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        name: 'T07.12-resilience-product',
        version: '1.0',
        comment: 'T07.12 – ingested during hook-disabled window',
        generatedAt: new Date().toISOString(),
      });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    productIds.push(res.body.data.id);
    log.ok('product ingested despite hook being disabled');
  });

  // @plan T07.12
  // @covers EOCP-E7-05
  it('Step 2 – re-enabling the hook (restoring event delivery) succeeds', async () => {
    log.step(`Step 2 — PATCH /product-ingestion-hook/${hookId} (re-enable)`);
    const res = await request(API)
      .patch(`/product-ingestion-hook/${hookId}`)
      .set('Cookie', cookie)
      .send({ enabled: true });
    log.http('PATCH', `/product-ingestion-hook/${hookId}`, res.status, res.status === 200 ? { enabled: res.body.data.enabled } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
    log.ok('hook re-enabled');
  });

  // @plan T07.12
  // @covers EOCP-E7-05
  it('Step 3 – job creation via API succeeds after the disruption window', async () => {
    log.step('Step 3 — POST /task (after event restore)');
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
        comment: 'T07.12 – job after event restore',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`task created after restore: ${res.body.data.id}`);
  });
});
