import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.3 — Export of environmental footprint metrics
// @covers EOCP-E15-03
//
// Description: Verifies that the CO2 metrics endpoint supports date-range filtering via from/to
//   query parameters. Export format is JSON. Full data export requires project_energy to be
//   populated from real job executions.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.3');

describe('T15.3 — Export of environmental footprint metrics', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T15.3
  // @covers EOCP-E15-03
  it('Step 1 – GET /metrics/co2 with from/to date range query is accepted (200)', async () => {
    log.step('Step 1 — GET /metrics/co2 with date range');

    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    log.action('GET /metrics/co2', { from, to });
    const res = await request(API).get('/metrics/co2').query({ from, to });
    log.http('GET', '/metrics/co2', res.status, res.body);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok('date range query accepted, 200 returned');
  });

  // @plan T15.3
  // @covers EOCP-E15-03
  it('Step 2 – response content-type is application/json', async () => {
    log.step('Step 2 — GET /metrics/co2 (verify content-type)');

    log.action('GET /metrics/co2');
    const res = await request(API).get('/metrics/co2');
    log.http('GET', '/metrics/co2', res.status, {
      'content-type': res.headers['content-type'],
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    log.ok('content-type is application/json');
  });

  // @plan T15.3
  // @covers EOCP-E15-03
  it('Step 3 – GET /metrics (Prometheus) responds with text/plain and contains dpmc_ metrics', async () => {
    log.step('Step 3 — GET /metrics (Prometheus format)');

    log.action('GET /metrics');
    const res = await request(API).get('/metrics');
    log.http('GET', '/metrics', res.status, {
      'content-type': res.headers['content-type'],
      length: res.text?.length,
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('dpmc_co2_grams');
    log.ok('Prometheus endpoint exposes dpmc_co2_grams metric');
  });
});
