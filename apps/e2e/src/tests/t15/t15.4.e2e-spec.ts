import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.4 — Calibration of footprint estimation using reference workloads
// @covers EOCP-E15-01
//
// Description: Calibration relies on the data_center pue × emissionFactor parameters.
//   This test verifies that those parameters are stored in the DB and that the CO2 endpoint
//   reflects them (avg_factor drives co2Grams = energyWh × avgFactor / 1000).
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.4');

describe('T15.4 — Calibration of footprint estimation using reference workloads', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T15.4
  // @covers EOCP-E15-01
  it('Step 1 – GET /data-center returns at least the seeded data center with pue and emissionFactor', async () => {
    log.step('Step 1 — GET /data-center (verify calibration parameters)');

    log.action('GET /data-center');
    const res = await request(API).get('/data-center').set('Cookie', cookie);
    log.http('GET', '/data-center', res.status, res.body);
    expect(res.status).toBe(200);

    const items: Record<string, unknown>[] = res.body.data?.items ?? res.body.data ?? [];
    expect(items.length).toBeGreaterThan(0);
    log.ok(`${items.length} data center(s) found`);

    for (const dc of items) {
      expect(typeof dc.pue).toBe('number');
      expect(typeof dc.emissionFactor).toBe('number');
      expect((dc.pue as number)).toBeGreaterThan(0);
      expect((dc.emissionFactor as number)).toBeGreaterThan(0);
    }
    log.ok('all data centers have valid pue and emissionFactor');
  });

  // @plan T15.4
  // @covers EOCP-E15-01
  it('Step 2 – GET /metrics/co2 co2Grams is non-negative for all items', async () => {
    log.step('Step 2 — GET /metrics/co2 (verify co2Grams >= 0)');

    log.action('GET /metrics/co2');
    const res = await request(API).get('/metrics/co2');
    log.http('GET', '/metrics/co2', res.status, res.body);
    expect(res.status).toBe(200);

    const items: Record<string, unknown>[] = res.body.data;
    if (items.length === 0) {
      log.ok('no data yet — calibration output check skipped');
      return;
    }

    for (const item of items) {
      expect((item.co2Grams as number)).toBeGreaterThanOrEqual(0);
      expect((item.energyWh as number)).toBeGreaterThanOrEqual(0);
    }
    log.ok('all items have non-negative co2Grams and energyWh');
  });

  // @plan T15.4
  // @covers EOCP-E15-01
  it('Step 3 – co2Grams is consistent with energyWh × pue × emissionFactor formula', async () => {
    log.step('Step 3 — verify co2Grams formula consistency');

    const [metricsRes, dcRes] = await Promise.all([
      request(API).get('/metrics/co2'),
      request(API).get('/data-center').set('Cookie', cookie),
    ]);
    log.http('GET', '/metrics/co2', metricsRes.status, metricsRes.body);
    log.http('GET', '/data-center', dcRes.status, { count: (dcRes.body.data?.items ?? dcRes.body.data ?? []).length });
    expect(metricsRes.status).toBe(200);
    expect(dcRes.status).toBe(200);

    const items: Record<string, unknown>[] = metricsRes.body.data;
    if (items.length === 0) {
      log.ok('no data yet — formula check skipped');
      return;
    }

    const dataCenters: Record<string, unknown>[] = dcRes.body.data?.items ?? dcRes.body.data ?? [];
    const avgFactor = dataCenters.reduce((sum, dc) => sum + (dc.pue as number) * (dc.emissionFactor as number), 0) / dataCenters.length;
    log.ok(`avgFactor=${avgFactor.toFixed(4)}`);

    for (const item of items) {
      const expected = ((item.energyWh as number) * avgFactor) / 1000;
      expect(Math.abs((item.co2Grams as number) - expected)).toBeLessThan(0.001);
    }
    log.ok('co2Grams matches energyWh × avgFactor / 1000 for all items');
  });
});
