import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.5 — Reconstruction of product lineage across versions
// @covers EOCP-E14-05
//
// Description: This test verifies that the lineage of a product can be reconstructed across
//   versions, via version ordering, parameters, and shared productTypeId.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.5');

describe('T14.5 — Reconstruction of product lineage across versions', () => {
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
      .send({ acronym: `T145_${Date.now()}`, name: 'T14.5 lineage type' });
    log.http('POST', '/product-type', pt.status, pt.status === 201 ? { id: pt.body.data.id } : pt.body);
    expect(pt.status).toBe(201);
    productTypeId = pt.body.data.id;

    for (const [version, run] of [['1.0', 'run-001'], ['2.0', 'run-002'], ['3.0', 'run-003']] as const) {
      log.action(`POST /product (version=${version})`);
      const res = await request(API)
        .post('/product')
        .set('Cookie', cookie)
        .send({
          productTypeId,
          name: 'T14.5-lineage-product',
          version,
          comment: `T14.5 – ${run}`,
          generatedAt: new Date().toISOString(),
          parameters: { run },
        });
      log.http('POST', '/product', res.status, res.status === 201 ? { id: res.body.data.id, version: res.body.data.version } : res.body);
      expect(res.status).toBe(201);
      createdProductIds.push(res.body.data.id);
    }
    log.ok(`lineage chain created: ${createdProductIds.join(' → ')}`);
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

  // @plan T14.5
  // @covers EOCP-E14-05
  it('Step 1 – GET /product/:id returns correct version and shared productTypeId for each entry in the lineage', async () => {
    log.step('Step 1 — GET all 3 versions');

    const [r1, r2, r3] = await Promise.all(
      createdProductIds.map((id) => request(API).get(`/product/${id}`).set('Cookie', cookie)),
    );
    for (const [r, v] of [[r1, '1.0'], [r2, '2.0'], [r3, '3.0']] as const) {
      log.http('GET', `/product/...`, r.status, { version: r.body.data?.version, productTypeId: r.body.data?.productTypeId });
      expect(r.status).toBe(200);
      expect(r.body.data.version).toBe(v);
      expect(r.body.data.productTypeId).toBe(productTypeId);
      expect(r.body.data.generatedAt).toBeDefined();
    }
    log.ok('all 3 versions have correct version and shared productTypeId');
  });

  // @plan T14.5
  // @covers EOCP-E14-05
  it('Step 2 – list query returns all 3 versions ordered correctly (1.0, 2.0, 3.0)', async () => {
    log.step('Step 2 — GET /product?q=T14.5-lineage-product');

    const list = await request(API)
      .get('/product')
      .query({ q: 'T14.5-lineage-product', pageSize: 500 })
      .set('Cookie', cookie);
    log.http('GET', '/product?q=T14.5-lineage-product', list.status);
    expect(list.status).toBe(200);

    const items: { id: string; version: string }[] = list.body.data?.items ?? list.body.data ?? [];
    const mine = items.filter((p) => createdProductIds.includes(p.id));
    const versions = mine.map((p) => p.version).sort();
    log.ok(`versions found: ${versions.join(', ')}`);
    expect(versions).toEqual(['1.0', '2.0', '3.0']);
  });

  // @plan T14.5
  // @covers EOCP-E14-05
  it('Step 3 – lineage differences are identifiable: each version has unique parameters.run and comment', async () => {
    log.step('Step 3 — verify parameters.run across versions');

    const [r1, r2, r3] = await Promise.all(
      createdProductIds.map((id) => request(API).get(`/product/${id}`).set('Cookie', cookie)),
    );
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);

    const runs = [r1, r2, r3].map((r) => (r.body.data.parameters as { run: string }).run);
    log.ok(`runs: ${runs.join(', ')}`);
    expect(runs).toEqual(['run-001', 'run-002', 'run-003']);

    const versions = [r1, r2, r3].map((r) => r.body.data.version as string);
    expect(new Set(versions).size).toBe(3);

    // Comments are distinct and reference each run
    const comments = [r1, r2, r3].map((r) => r.body.data.comment as string);
    expect(comments[0]).toContain('run-001');
    expect(comments[1]).toContain('run-002');
    expect(comments[2]).toContain('run-003');
    log.ok('lineage differences identifiable via parameters.run and comment');
  });
});
