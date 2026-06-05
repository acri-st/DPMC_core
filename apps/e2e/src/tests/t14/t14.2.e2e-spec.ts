import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.2 — Traceability of product versions in catalog metadata
// @covers EOCP-E14-02
//
// Description: This test verifies that each product version is clearly identified and traceable
//   through catalog metadata (version, generatedAt, parameters, comment).
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.2');

describe('T14.2 — Traceability of product versions in catalog metadata', () => {
  let cookie: string;
  let productTypeId: string;
  const createdProductIds: string[] = [];

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
      .send({ acronym: `T142_${Date.now()}`, name: 'T14.2 traceability type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;

    for (const [version, run] of [['1.0.0', 'run-initial'], ['1.1.0', 'run-reprocessed']] as const) {
      log.action(`POST /product (version ${version})`);
      const res = await request(API)
        .post('/product')
        .set('Cookie', cookie)
        .send({
          productTypeId,
          name: 'T14.2-traceable-product',
          version,
          comment: `T14.2 – ${run}`,
          generatedAt: new Date().toISOString(),
          parameters: { processingRun: run },
        });
      log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version } : res.body);
      expect(res.status).toBe(201);
      createdProductIds.push(res.body.data.id);
    }
    log.ok(`created products: ${createdProductIds.join(', ')}`);
  });

  afterAll(async () => {
    for (const id of createdProductIds) {
      await request(API).delete(`/product/${id}`).set('Cookie', cookie);
    }
    if (productTypeId) {
      await request(API).delete(`/product-type/${productTypeId}`).set('Cookie', cookie);
    }
    log.ok('afterAll cleanup done');
  });

  // @plan T14.2
  // @covers EOCP-E14-02
  it('Step 1 – GET /product/:id returns full metadata for a versioned product', async () => {
    log.step(`Step 1 — GET /product/${createdProductIds[0]}`);

    const res = await request(API).get(`/product/${createdProductIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/product/${createdProductIds[0]}`, res.status, res.status === 200 ? { id: res.body.data.id, version: res.body.data.version, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(200);

    const p = res.body.data;
    expect(p.id).toBe(createdProductIds[0]);
    expect(p.version).toBe('1.0.0');
    expect(p.productTypeId).toBe(productTypeId);
    expect(p.name).toBe('T14.2-traceable-product');
    expect(p.generatedAt).toBeDefined();
    expect(p.parameters).toBeDefined();
    log.ok(`full metadata present for ${p.id}`);
  });

  // @plan T14.2
  // @covers EOCP-E14-02
  it('Step 2 – version field is present and distinct on each product entry', async () => {
    log.step('Step 2 — GET both products, verify distinct versions');

    const [r1, r2] = await Promise.all(
      createdProductIds.map((id) => request(API).get(`/product/${id}`).set('Cookie', cookie)),
    );
    log.http('GET', `/product/${createdProductIds[0]}`, r1.status, { version: r1.body.data?.version });
    log.http('GET', `/product/${createdProductIds[1]}`, r2.status, { version: r2.body.data?.version });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    expect(r1.body.data.version).toBe('1.0.0');
    expect(r2.body.data.version).toBe('1.1.0');
    expect(r1.body.data.version).not.toBe(r2.body.data.version);
    expect(r1.body.data.id).not.toBe(r2.body.data.id);
    log.ok('versions are distinct');
  });

  // @plan T14.2
  // @covers EOCP-E14-02
  it('Step 3 – metadata fields (generatedAt, parameters, comment) match the production context', async () => {
    log.step(`Step 3 — GET /product/${createdProductIds[1]} (verify traceability fields)`);

    const res = await request(API).get(`/product/${createdProductIds[1]}`).set('Cookie', cookie);
    log.http('GET', `/product/${createdProductIds[1]}`, res.status, res.status === 200 ? { version: res.body.data.version, comment: res.body.data.comment } : res.body);
    expect(res.status).toBe(200);

    const p = res.body.data;
    expect(p.version).toBe('1.1.0');
    expect(p.comment).toContain('run-reprocessed');
    expect(p.generatedAt).toBeDefined();
    expect(typeof p.generatedAt).toBe('string');
    expect(p.parameters).toBeDefined();
    expect((p.parameters as { processingRun: string }).processingRun).toBe('run-reprocessed');
    log.ok('traceability fields match production context');
  });
});
