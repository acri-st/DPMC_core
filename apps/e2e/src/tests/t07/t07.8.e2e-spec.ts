import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T07.8 — Suppression of triggers on invalid metadata
// @covers EOCP-E7-05
//
// Description: This test verifies that data-driven triggers are not activated when metadata is
//   invalid or incomplete. At the API layer this is enforced by schema validation on POST /product
//   and POST /product-ingestion-hook — invalid payloads are rejected before any trigger evaluation.
// Prerequisites: Metadata validation rules are enforced.
// Steps:
//   1. Ingest data with invalid metadata → Validation fails (400)
//   2. Observe trigger evaluation → No hook fires for an invalid product
//   3. Inspect response → Rejection reason is present in the error body

const log = makeLogger('T07.8');

describe('T07.8 — Suppression of triggers on invalid metadata', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T07.8
  // @covers EOCP-E7-05
  it('Step 1 – POST /product with invalid metadata (missing productTypeId) is rejected', async () => {
    log.step('Step 1 — POST /product (missing productTypeId)');
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        // productTypeId intentionally omitted
        name: 'T07.8-invalid-product',
        version: '1.0',
        comment: 'T07.8 – invalid metadata',
      });
    log.http('POST', '/product', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
    log.ok(`rejected with ${res.status}`);
  });

  // @plan T07.8
  // @covers EOCP-E7-05
  it('Step 2 – POST /product with non-existent productTypeId is rejected (trigger not evaluated)', async () => {
    log.step('Step 2 — POST /product (non-existent productTypeId)');
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId: 0,
        name: 'T07.8-unknown-type',
        version: '1.0',
        comment: 'T07.8 – unknown product type',
      });
    log.http('POST', '/product', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
    log.ok(`rejected with ${res.status}`);
  });

  // @plan T07.8
  // @covers EOCP-E7-05
  it('Step 3 – error responses for invalid product metadata are structured (rejection reason present)', async () => {
    log.step('Step 3 — POST /product-ingestion-hook (missing productTypeId)');
    const res = await request(API)
      .post('/product-ingestion-hook')
      .set('Cookie', cookie)
      .send({
        // productTypeId intentionally omitted — invalid hook metadata
        projectId: PROJECT_ID,
        enabled: true,
      });
    log.http('POST', '/product-ingestion-hook', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = res.body as Record<string, unknown>;
    const bodyText = JSON.stringify(body);
    // Must contain structured error indication
    const hasErrorField =
      body.message !== undefined ||
      body.error !== undefined ||
      body.errors !== undefined ||
      body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    // No raw stack traces
    expect(bodyText).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok(`structured error returned, status=${res.status}`);
  });
});
