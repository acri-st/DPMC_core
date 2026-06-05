import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.7 — Performance of footprint metric export on large datasets
// @covers EOCP-E15-01
//
// Description: Verifies that the CO2 endpoint responds within an acceptable time budget
//   regardless of the number of projects in the view. Also verifies invalid groupBy values
//   are rejected gracefully.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.7');

const ACCEPTABLE_RESPONSE_MS = 3000;

describe('T15.7 — Performance of footprint metric export on large datasets', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T15.7
  // @covers EOCP-E15-01
  it(`Step 1 – GET /metrics/co2 responds within ${ACCEPTABLE_RESPONSE_MS}ms`, async () => {
    log.step('Step 1 — GET /metrics/co2 (response time)');

    log.action('GET /metrics/co2 (timed)');
    const start = Date.now();
    const res = await request(API).get('/metrics/co2');
    const elapsed = Date.now() - start;
    log.http('GET', '/metrics/co2', res.status, { elapsedMs: elapsed });
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(ACCEPTABLE_RESPONSE_MS);
    log.ok(`responded in ${elapsed}ms (limit: ${ACCEPTABLE_RESPONSE_MS}ms)`);
  });

  // @plan T15.7
  // @covers EOCP-E15-01
  it('Step 2 – GET /metrics (Prometheus) responds within acceptable time', async () => {
    log.step('Step 2 — GET /metrics (Prometheus, timed)');

    log.action('GET /metrics (timed)');
    const start = Date.now();
    const res = await request(API).get('/metrics');
    const elapsed = Date.now() - start;
    log.http('GET', '/metrics', res.status, { elapsedMs: elapsed, length: res.text?.length });
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(ACCEPTABLE_RESPONSE_MS);
    log.ok(`responded in ${elapsed}ms`);
  });

  // @plan T15.7
  // @covers EOCP-E15-01
  it('Step 3 – invalid groupBy value is rejected with 400', async () => {
    log.step('Step 3 — GET /metrics/co2?groupBy=invalid (expect 4xx)');

    log.action('GET /metrics/co2', { groupBy: 'invalid' });
    const res = await request(API).get('/metrics/co2').query({ groupBy: 'invalid' });
    log.http('GET', '/metrics/co2?groupBy=invalid', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`invalid groupBy rejected with ${res.status}`);
  });
});
