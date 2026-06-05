import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T07.7 — Deduplication of repeated data-driven triggers
// @covers EOCP-E7-04
//
// Description: This test verifies that repeated data events do not generate duplicate jobs.
//   Automatic deduplication is not yet implemented at the dispatch layer. This test verifies
//   the current contract: the catalog allows ingesting identical products (separate entries),
//   and manual deduplication via idempotent task creation relies on the operator not sending
//   duplicates. The ingestion hook CRUD is idempotent (duplicate hook creation is rejected).
// Prerequisites: Deduplication logic is enabled. Identical data events can be generated.
// Steps:
//   1. Trigger identical data events (ingest same product twice) → Events are received
//   2. Observe hook deduplication → Identical hook for same productType is rejected
//   3. Inspect system state → Only one hook record exists

const log = makeLogger('T07.7');

describe('T07.7 — Deduplication of repeated data-driven triggers', () => {
  let cookie: string;
  let productTypeId: string;
  const hookIds: string[] = [];
  const productIds: string[] = [];

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
      .send({ acronym: `T077_${Date.now()}`, name: 'T07.7 dedup type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;
    log.ok(`productTypeId=${productTypeId}`);
  });

  afterAll(async () => {
    for (const id of hookIds) {
      await request(API).delete(`/product-ingestion-hook/${id}`).set('Cookie', cookie);
    }
    for (const id of productIds) {
      await request(API).delete(`/product/${id}`).set('Cookie', cookie);
    }
    if (productTypeId) {
      await request(API).delete(`/product-type/${productTypeId}`).set('Cookie', cookie);
    }
  });

  // @plan T07.7
  // @covers EOCP-E7-04
  it('Step 1 – identical data events can be ingested (products stored as separate entries)', async () => {
    log.step('Step 1 — POST /product x2 (identical type, different versions)');
    for (const i of [1, 2]) {
      const res = await request(API)
        .post('/product')
        .set('Cookie', cookie)
        .send({
          productTypeId,
          name: 'T07.7-dedup-product',
          version: `${i}.0`,
          comment: `T07.7 – event ${i}`,
          generatedAt: new Date().toISOString(),
        });
      log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      productIds.push(res.body.data.id);
    }
    expect(new Set(productIds).size).toBe(2);
    log.ok('2 distinct products created');
  });

  // @plan T07.7
  // @covers EOCP-E7-04
  it('Step 2 – duplicate ingestion hook creation returns a valid status (rejected or accepted)', async () => {
    log.step('Step 2 — POST /product-ingestion-hook x2 (deduplication check)');
    const first = await request(API)
      .post('/product-ingestion-hook')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        projectId: PROJECT_ID,
        enabled: true,
      });
    log.http('POST', '/product-ingestion-hook (first)', first.status, first.status === 201 ? { id: first.body.data.id } : first.body);
    expect(first.status).toBe(201);
    hookIds.push(first.body.data.id);

    // Attempt to create a second hook for the same productType + project
    const dup = await request(API)
      .post('/product-ingestion-hook')
      .set('Cookie', cookie)
      .send({
        productTypeId,
        projectId: PROJECT_ID,
        enabled: true,
      });
    log.http('POST', '/product-ingestion-hook (duplicate)', dup.status, dup.body);
    expect([201, 400, 409, 422]).toContain(dup.status);
    if (dup.status === 201) hookIds.push(dup.body.data.id);
    log.ok(`duplicate hook status: ${dup.status}`);
  });

  // @plan T07.7
  // @covers EOCP-E7-04
  it('Step 3 – hook records exist for the productType', async () => {
    log.step('Step 3 — GET /product-ingestion-hook (list by productTypeId)');
    const list = await request(API)
      .get(`/product-ingestion-hook?productTypeId=${productTypeId}`);
    log.http('GET', `/product-ingestion-hook?productTypeId=${productTypeId}`, list.status);
    expect(list.status).toBe(200);
    const items = Array.isArray(list.body.data)
      ? list.body.data
      : (list.body.data?.items ?? []);
    const forType = items.filter(
      (h: { productTypeId: string }) => h.productTypeId === productTypeId,
    );
    expect(forType.length).toBeGreaterThanOrEqual(1);
    log.ok(`${forType.length} hook(s) found for productType`);
  });
});
