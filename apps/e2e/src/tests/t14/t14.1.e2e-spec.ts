import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.1 — Coexistence of multiple versions of the same product
// @covers EOCP-E14-01
//
// Description: This test verifies that multiple versions of the same product can coexist in the
//   catalog without overwriting each other.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.1');

describe('T14.1 — Coexistence of multiple versions of the same product', () => {
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
      .send({ acronym: `T141_${Date.now()}`, name: 'T14.1 version coexistence type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;
    log.ok(`productTypeId=${productTypeId}`);
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

  // @plan T14.1
  // @covers EOCP-E14-01
  it('Step 1 – POST /product with version V1 is stored with correct fields', async () => {
    log.step('Step 1 — POST /product (V1)');

    log.action('POST /product', { productTypeId, version: 'V1' });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({ productTypeId, name: 'T14.1-product', version: 'V1', comment: 'T14.1 – version V1' });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.data.id);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe('V1');
    expect(res.body.data.productTypeId).toBe(productTypeId);
    expect(res.body.data.name).toBe('T14.1-product');
    expect(res.body.data.comment).toBe('T14.1 – version V1');
    log.ok(`V1 stored: ${res.body.data.id}`);
  });

  // @plan T14.1
  // @covers EOCP-E14-01
  it('Step 2 – POST /product with version V2 creates a separate entry with its own id', async () => {
    log.step('Step 2 — POST /product (V2)');

    log.action('POST /product', { productTypeId, version: 'V2' });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({ productTypeId, name: 'T14.1-product', version: 'V2', comment: 'T14.1 – version V2' });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version } : res.body);
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.data.id);

    expect(res.body.data.version).toBe('V2');
    expect(res.body.data.id).not.toBe(createdProductIds[0]);
    expect(res.body.data.productTypeId).toBe(productTypeId);
    log.ok(`V2 stored as separate entry: ${res.body.data.id}`);
  });

  // @plan T14.1
  // @covers EOCP-E14-01
  it('Step 3 – GET /product/:id confirms both versions are independently accessible with correct fields', async () => {
    log.step('Step 3 — GET /product/:id for each version');
    expect(createdProductIds).toHaveLength(2);

    const [r1, r2] = await Promise.all(
      createdProductIds.map((id) => request(API).get(`/product/${id}`).set('Cookie', cookie)),
    );
    log.http('GET', `/product/${createdProductIds[0]}`, r1.status, r1.status === 200 ? { version: r1.body.data.version } : r1.body);
    log.http('GET', `/product/${createdProductIds[1]}`, r2.status, r2.status === 200 ? { version: r2.body.data.version } : r2.body);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    expect(r1.body.data.id).toBe(createdProductIds[0]);
    expect(r1.body.data.version).toBe('V1');
    expect(r1.body.data.productTypeId).toBe(productTypeId);
    expect(r2.body.data.id).toBe(createdProductIds[1]);
    expect(r2.body.data.version).toBe('V2');
    expect(r2.body.data.productTypeId).toBe(productTypeId);

    log.action('GET /product (list by name)');
    const list = await request(API).get('/product').query({ q: 'T14.1-product', pageSize: 500 }).set('Cookie', cookie);
    log.http('GET', '/product?q=T14.1-product', list.status);
    expect(list.status).toBe(200);
    const items: { id: string }[] = list.body.data?.items ?? list.body.data ?? [];
    const listedIds = new Set(items.map((p) => p.id));
    expect(listedIds.has(createdProductIds[0])).toBe(true);
    expect(listedIds.has(createdProductIds[1])).toBe(true);
    log.ok('both versions present in list');
  });
});
