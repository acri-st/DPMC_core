import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.4 — Prevention of accidental product overwriting
// @covers EOCP-E14-01
//
// Description: This test verifies that generating a new product version does not overwrite an
//   existing version. The original must remain intact regardless of the API behavior on duplicate.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.4');

describe('T14.4 — Prevention of accidental product overwriting', () => {
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
      .send({ acronym: `T144_${Date.now()}`, name: 'T14.4 overwrite prevention type' });
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

  // @plan T14.4
  // @covers EOCP-E14-01
  it('Step 1 – POST /product with version V1 is stored with correct id, version, comment', async () => {
    log.step('Step 1 — POST /product (V1 initial)');

    log.action('POST /product', { version: 'V1' });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({ productTypeId, name: 'T14.4-product', version: 'V1', comment: 'T14.4 – initial version' });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version, comment: res.body.data.comment } : res.body);
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.data.id);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe('V1');
    expect(res.body.data.productTypeId).toBe(productTypeId);
    expect(res.body.data.comment).toBe('T14.4 – initial version');
    log.ok(`V1 stored: ${res.body.data.id}`);
  });

  // @plan T14.4
  // @covers EOCP-E14-01
  it('Step 2 – duplicate POST (same name+version) does not corrupt original V1 entry', async () => {
    log.step('Step 2 — POST /product (V1 duplicate attempt)');

    log.action('POST /product (duplicate V1)');
    const dup = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({ productTypeId, name: 'T14.4-product', version: 'V1', comment: 'T14.4 – attempted overwrite' });
    log.http('POST', '/product (dup)', dup.status, dup.body);

    // API may reject (409) or create a new separate entry (201) — both are acceptable
    expect([201, 409]).toContain(dup.status);
    if (dup.status === 201) {
      createdProductIds.push(dup.body.data.id);
      expect(dup.body.data.id).not.toBe(createdProductIds[0]);
      log.ok(`duplicate created separate entry: ${dup.body.data.id}`);
    } else {
      log.ok(`duplicate correctly rejected: ${dup.status}`);
    }

    // Original V1 must be preserved — id, version, comment unchanged
    const check = await request(API).get(`/product/${createdProductIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/product/${createdProductIds[0]}`, check.status, { version: check.body.data?.version, comment: check.body.data?.comment });
    expect(check.status).toBe(200);
    expect(check.body.data.id).toBe(createdProductIds[0]);
    expect(check.body.data.version).toBe('V1');
    expect(check.body.data.comment).toBe('T14.4 – initial version');
    log.ok('original V1 intact after duplicate attempt');
  });

  // @plan T14.4
  // @covers EOCP-E14-01
  it('Step 3 – POST /product with incremented version V2 creates a new independent entry', async () => {
    log.step('Step 3 — POST /product (V2 new version)');

    log.action('POST /product', { version: 'V2' });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({ productTypeId, name: 'T14.4-product', version: 'V2', comment: 'T14.4 – incremented version' });
    log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version } : res.body);
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.data.id);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe('V2');
    expect(res.body.data.id).not.toBe(createdProductIds[0]);
    expect(res.body.data.comment).toBe('T14.4 – incremented version');

    // V1 still accessible and unchanged
    const v1 = await request(API).get(`/product/${createdProductIds[0]}`).set('Cookie', cookie);
    expect(v1.status).toBe(200);
    expect(v1.body.data.version).toBe('V1');
    log.ok(`V2 stored: ${res.body.data.id}; V1 still intact: ${createdProductIds[0]}`);
  });
});
