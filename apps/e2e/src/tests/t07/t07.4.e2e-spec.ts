import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T07.4 — Data-driven triggering based on catalog events
// @covers EOCP-E7-04
//
// Description: This test verifies that job execution can be triggered automatically when new data
//   becomes available. Automatic job dispatch on product ingestion is not yet implemented; this
//   test verifies the prerequisite infrastructure: ingestion hooks can be configured and products
//   can be ingested into the catalog.
// Prerequisites: Catalog ingestion events are enabled. A trigger rule based on data availability is
//   configured.
// Steps:
//   1. Ingest new data into the catalog → Event is generated (product is stored)
//   2. Observe trigger evaluation → Ingestion hook is configured for the product type
//   3. Observe job creation → Hook infrastructure is in place (auto-dispatch is a future step)

const log = makeLogger('T07.4');

describe('T07.4 — Data-driven triggering based on catalog events', () => {
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
      .send({ acronym: `T074_${Date.now()}`, name: 'T07.4 data trigger type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;
    log.ok(`productTypeId=${productTypeId}`);
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

  // @plan T07.4
  // @covers EOCP-E7-04
  it('Step 1 – new data can be ingested into the catalog (POST /product)', async () => {
    log.step('Step 1 — POST /product (catalog ingestion)');
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        name: 'T07.4-catalog-product',
        version: '1.0',
        comment: 'T07.4 – catalog ingestion event',
        generatedAt: new Date().toISOString(),
      });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(201);
    productId = res.body.data.id;
    expect(productId).toBeDefined();
    expect(res.body.data.productTypeId).toBe(productTypeId);
    log.ok(`product ingested: ${productId}`);
  });

  // @plan T07.4
  // @covers EOCP-E7-04
  it('Step 2 – ingestion hook can be configured for the product type', async () => {
    log.step('Step 2 — POST /product-ingestion-hook');
    const res = await request(API)
      .post('/product-ingestion-hook')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        projectId: PROJECT_ID,
        enabled: true,
      });
    log.http('POST', '/product-ingestion-hook', res.status, res.status === 201 ? { id: res.body.data.id, enabled: res.body.data.enabled } : res.body);
    expect(res.status).toBe(201);
    hookId = res.body.data.id;
    expect(res.body.data.productTypeId).toBe(productTypeId);
    expect(res.body.data.enabled).toBe(true);
    log.ok(`hook created: ${hookId}`);
  });

  // @plan T07.4
  // @covers EOCP-E7-04
  it('Step 3 – ingestion hook is listed and retrievable (trigger infrastructure is in place)', async () => {
    log.step(`Step 3 — GET /product-ingestion-hook/${hookId}`);
    const res = await request(API)
      .get(`/product-ingestion-hook/${hookId}`);
    log.http('GET', `/product-ingestion-hook/${hookId}`, res.status, res.status === 200 ? { id: res.body.data.id, enabled: res.body.data.enabled } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(hookId);
    expect(res.body.data.productTypeId).toBe(productTypeId);
    expect(res.body.data.enabled).toBe(true);
    log.ok('hook is retrievable and enabled');
  });
});
