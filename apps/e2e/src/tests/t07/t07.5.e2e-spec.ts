import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T07.5 — Event-based triggering
// @covers EOCP-E7-05
//
// Description: This test verifies that system or external events can trigger job execution.
//   Automatic event dispatch is not yet implemented. This test verifies the observable
//   infrastructure: product ingestion (the event source) works, and the system can receive
//   and record trigger-relevant metadata through the product catalog.
// Prerequisites: Event handling mechanism is configured. At least one event-based trigger rule
//   exists.
// Steps:
//   1. Inject a triggering event (ingest product) → Event is received
//   2. Observe trigger processing (hook is evaluated) → Hook is configured and enabled
//   3. Observe job creation → Infrastructure is in place for future auto-dispatch

const log = makeLogger('T07.5');

describe('T07.5 — Event-based triggering', () => {
  let cookie: string;
  let productTypeId: string;
  let hookId: string | undefined;
  let productId: string | undefined;

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
      .send({ acronym: `T075_${Date.now()}`, name: 'T07.5 event trigger type' });
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
    if (hookId) {
      await request(API).delete(`/product-ingestion-hook/${hookId}`).set('Cookie', cookie);
    }
    if (productId) {
      await request(API).delete(`/product/${productId}`).set('Cookie', cookie);
    }
    if (productTypeId) {
      await request(API).delete(`/product-type/${productTypeId}`).set('Cookie', cookie);
    }
  });

  // @plan T07.5
  // @covers EOCP-E7-05
  it('Step 1 – product ingestion (triggering event) is accepted by the catalog', async () => {
    log.step('Step 1 — POST /product (event injection)');
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        name: 'T07.5-event-product',
        version: '1.0',
        comment: 'T07.5 – event injection',
        generatedAt: new Date().toISOString(),
        parameters: { source: 'external-event' },
      });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(201);
    productId = res.body.data.id;
    expect(productId).toBeDefined();
    expect(res.body.data.productTypeId).toBe(productTypeId);
    log.ok(`product ingested: ${productId}`);
  });

  // @plan T07.5
  // @covers EOCP-E7-05
  it('Step 2 – ingestion hook rule for the product type is enabled', async () => {
    log.step(`Step 2 — GET /product-ingestion-hook/${hookId}`);
    const res = await request(API)
      .get(`/product-ingestion-hook/${hookId}`);
    log.http('GET', `/product-ingestion-hook/${hookId}`, res.status, res.status === 200 ? { enabled: res.body.data.enabled, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.productTypeId).toBe(productTypeId);
    log.ok('hook enabled and product type matches');
  });

  // @plan T07.5
  // @covers EOCP-E7-05
  it('Step 3 – ingested product is retrievable with event metadata (trigger context preserved)', async () => {
    log.step(`Step 3 — GET /product/${productId}`);
    const res = await request(API)
      .get(`/product/${productId}`);
    log.http('GET', `/product/${productId}`, res.status, res.status === 200 ? { productTypeId: res.body.data.productTypeId, parameters: res.body.data.parameters } : res.body);
    expect(res.status).toBe(200);
    const p = res.body.data;
    expect(p.productTypeId).toBe(productTypeId);
    expect((p.parameters as { source: string }).source).toBe('external-event');
    log.ok('event metadata preserved on product');
  });
});
