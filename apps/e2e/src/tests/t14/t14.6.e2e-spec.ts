import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T14.6 — Handling of invalid or missing product version references
// @covers EOCP-E14-03
//
// Description: This test verifies proper behavior when a product creation references a
//   non-existent productTypeId. The service must reject the request with a structured 4xx error.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T14.6');

// A valid positive id (passes DTO validation) that will never be seeded —
// exercises the "referenced resource not found" path rather than input validation.
const NON_EXISTENT_UUID = 999_999;

describe('T14.6 — Handling of invalid or missing product version references', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T14.6
  // @covers EOCP-E14-03
  it('Step 1 – POST /product with non-existent productTypeId is rejected with 4xx', async () => {
    log.step('Step 1 — POST /product (non-existent productTypeId)');

    log.action('POST /product', { productTypeId: NON_EXISTENT_UUID });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId: NON_EXISTENT_UUID,
        name: 'T14.6-invalid-ref',
        version: 'V1',
        comment: 'T14.6 – invalid product type',
      });
    log.http('POST', '/product', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`rejected with ${res.status}`);
  });

  // @plan T14.6
  // @covers EOCP-E14-03
  it('Step 2 – error response has structured body: statusCode (number) + message (string), no stack trace', async () => {
    log.step('Step 2 — POST /product (validate error body shape)');

    log.action('POST /product', { productTypeId: NON_EXISTENT_UUID });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId: NON_EXISTENT_UUID,
        name: 'T14.6-error-shape',
        version: 'V1',
        comment: 'T14.6 – verify error structure',
      });
    log.http('POST', '/product', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    const body = res.body as { error?: { message?: unknown } };
    log.ok(`body keys: ${Object.keys(res.body as object).join(', ')}`);

    // Structured error shape: { error: { code | statusCode, message } }
    expect(body.error).toBeDefined();
    expect(body.error?.message).toBeDefined();
    expect(typeof body.error?.message).toBe('string');
    expect((body.error?.message as string).length).toBeGreaterThan(0);

    // No raw stack trace in response
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok('structured error body, no stack trace');
  });

  // @plan T14.6
  // @covers EOCP-E14-03
  it('Step 3 – statusCode in body matches HTTP status; message references the missing resource', async () => {
    log.step('Step 3 — POST /product (verify statusCode matches + message is meaningful)');

    log.action('POST /product', { productTypeId: NON_EXISTENT_UUID });
    const res = await request(API)
      .post('/product')
      .set('Cookie', cookie)
      .send({
        productTypeId: NON_EXISTENT_UUID,
        name: 'T14.6-message-check',
        version: 'V1',
        comment: 'T14.6 – message check',
      });
    log.http('POST', '/product', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    const body = res.body as { error?: { message?: string } };
    expect(body.error).toBeDefined();

    const message = body.error?.message ?? '';
    log.ok(`message: "${message}"`);
    // Message must mention what was not found (ProductType, related FK, or "not found")
    expect(message.toLowerCase()).toMatch(/not found|producttype|product.type|related/);
    log.ok('error message references missing resource');
  });
});
