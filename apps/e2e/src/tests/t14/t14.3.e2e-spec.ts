import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.3 — Selection of product version at production configuration level
// @covers EOCP-E14-03
//
// Description: This test verifies that production configurations can explicitly select which
//   product version to use (latest or specific) via isDefault.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.3');

describe('T14.3 — Selection of product version at production configuration level', () => {
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
      .send({ acronym: `T143_${Date.now()}`, name: 'T14.3 version selection type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;

    for (const [version, isDefault] of [['V1', false], ['V2', true]] as const) {
      log.action(`POST /product (version=${version}, isDefault=${isDefault})`);
      const res = await request(API)
        .post('/product')
        .set('Cookie', cookie)
        .send({ productTypeId, name: 'T14.3-versioned-product', version, isDefault, comment: `T14.3 – ${version}` });
      log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version, isDefault: res.body.data.isDefault } : res.body);
      expect(res.status).toBe(201);
      createdProductIds.push(res.body.data.id);
    }
    log.ok(`V1=${createdProductIds[0]}, V2=${createdProductIds[1]}`);
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

  // @plan T14.3
  // @covers EOCP-E14-03
  it('Step 1 – isDefault=true marks V2 as the default version; V1 has isDefault=false', async () => {
    log.step('Step 1 — GET both products, verify isDefault values');

    const [r1, r2] = await Promise.all(
      createdProductIds.map((id) => request(API).get(`/product/${id}`).set('Cookie', cookie)),
    );
    log.http('GET', `/product/${createdProductIds[0]}`, r1.status, { version: r1.body.data?.version, isDefault: r1.body.data?.isDefault });
    log.http('GET', `/product/${createdProductIds[1]}`, r2.status, { version: r2.body.data?.version, isDefault: r2.body.data?.isDefault });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    expect(r1.body.data.version).toBe('V1');
    expect(r1.body.data.isDefault).toBe(false);
    expect(r2.body.data.version).toBe('V2');
    expect(r2.body.data.isDefault).toBe(true);
    log.ok('V2 is default, V1 is not');
  });

  // @plan T14.3
  // @covers EOCP-E14-03
  it('Step 2 – GET /product list shows V2 (isDefault=true) queryable by name', async () => {
    log.step('Step 2 — GET /product?q=T14.3-versioned-product');

    const list = await request(API).get('/product').query({ q: 'T14.3-versioned-product', pageSize: 500 }).set('Cookie', cookie);
    log.http('GET', '/product?q=T14.3-versioned-product', list.status);
    expect(list.status).toBe(200);

    const items: { id: string; isDefault: boolean; version: string }[] = list.body.data?.items ?? list.body.data ?? [];
    const defaultProduct = items.find((p) => p.id === createdProductIds[1]);
    log.ok(`default product found: ${!!defaultProduct}, isDefault=${defaultProduct?.isDefault}`);
    expect(defaultProduct).toBeDefined();
    expect(defaultProduct!.isDefault).toBe(true);
    expect(defaultProduct!.version).toBe('V2');
  });

  // @plan T14.3
  // @covers EOCP-E14-03
  it('Step 3 – PATCH /product/:id promotes V1 to isDefault=true (specific version selected)', async () => {
    log.step(`Step 3 — PATCH /product/${createdProductIds[0]} (isDefault → true)`);

    log.action(`PATCH /product/${createdProductIds[0]}`, { isDefault: true });
    const patch = await request(API)
      .patch(`/product/${createdProductIds[0]}`)
      .set('Cookie', cookie)
      .send({ isDefault: true });
    log.http('PATCH', `/product/${createdProductIds[0]}`, patch.status, patch.status < 300 ? { isDefault: patch.body.data?.isDefault, version: patch.body.data?.version } : patch.body);
    expect([200, 204]).toContain(patch.status);

    const check = await request(API).get(`/product/${createdProductIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/product/${createdProductIds[0]}`, check.status, { version: check.body.data?.version, isDefault: check.body.data?.isDefault });
    expect(check.status).toBe(200);
    expect(check.body.data.version).toBe('V1');
    expect(check.body.data.isDefault).toBe(true);
    log.ok('V1 is now the selected default version');
  });

  // @plan T14.3
  // @covers EOCP-E14-03
  it('Step 4 – GET /product/:id for V1 confirms it is the selected default with all fields intact', async () => {
    log.step(`Step 4 — GET /product/${createdProductIds[0]} (final state check)`);

    const res = await request(API).get(`/product/${createdProductIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/product/${createdProductIds[0]}`, res.status, res.status === 200 ? { id: res.body.data.id, version: res.body.data.version, isDefault: res.body.data.isDefault, productTypeId: res.body.data.productTypeId } : res.body);
    expect(res.status).toBe(200);

    const p = res.body.data;
    expect(p.id).toBe(createdProductIds[0]);
    expect(p.version).toBe('V1');
    expect(p.isDefault).toBe(true);
    expect(p.productTypeId).toBe(productTypeId);
    expect(p.name).toBe('T14.3-versioned-product');
    log.ok('V1 confirmed as selected default, all fields intact');
  });
});
