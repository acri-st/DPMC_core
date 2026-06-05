import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.1 — Collection of resource consumption metrics
// @covers EOCP-E15-01
//
// Description: Verifies that the API exposes a CO2/energy metrics endpoint that responds with
//   a well-shaped payload. Deep collection (energyWh > 0) requires project_energy view to be
//   populated, which depends on completed job executions.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.1');

describe('T15.1 — Collection of resource consumption metrics', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T15.1
  // @covers EOCP-E15-01
  it('Step 1 – GET /metrics/co2 responds 200 without authentication (public endpoint)', async () => {
    log.step('Step 1 — GET /metrics/co2 (no auth)');

    log.action('GET /metrics/co2');
    const res = await request(API).get('/metrics/co2');
    log.http('GET', '/metrics/co2', res.status, res.body);
    expect(res.status).toBe(200);
    log.ok('endpoint is publicly accessible');
  });

  // @plan T15.1
  // @covers EOCP-E15-01
  it('Step 2 – response body has success shape with data array', async () => {
    log.step('Step 2 — GET /metrics/co2 (verify response shape)');

    log.action('GET /metrics/co2');
    const res = await request(API).get('/metrics/co2');
    log.http('GET', '/metrics/co2', res.status, res.body);
    expect(res.status).toBe(200);

    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok(`data is array with ${(res.body.data as unknown[]).length} items`);
  });

  // @plan T15.1
  // @covers EOCP-E15-01
  it('Step 3 – each item in data has required Co2Aggregate fields', async () => {
    log.step('Step 3 — GET /metrics/co2 (verify aggregate item shape)');

    log.action('GET /metrics/co2');
    const res = await request(API).get('/metrics/co2');
    log.http('GET', '/metrics/co2', res.status, res.body);
    expect(res.status).toBe(200);

    const items: unknown[] = res.body.data;
    if (items.length === 0) {
      log.ok('no items yet (project_energy view not populated) — shape check skipped');
      return;
    }

    for (const item of items as Record<string, unknown>[]) {
      expect(typeof item.groupBy).toBe('string');
      expect(typeof item.bucket).toBe('string');
      expect(item.bucketName === null || typeof item.bucketName === 'string').toBe(true);
      expect(typeof item.energyWh).toBe('number');
      expect(typeof item.co2Grams).toBe('number');
      expect(typeof item.cpuSeconds).toBe('number');
    }
    log.ok(`all ${items.length} items have correct Co2Aggregate shape`);
  });
});
