import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.6 — Correct metric association under concurrent executions
// @covers EOCP-E15-03
//
// Description: Verifies that concurrent requests to the CO2 endpoint all receive consistent,
//   non-crossed responses (same data, no race-condition artifacts). Per-job attribution requires
//   project_energy to be populated.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.6');

describe('T15.6 — Correct metric association under concurrent executions', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T15.6
  // @covers EOCP-E15-03
  it('Step 1 – 5 concurrent GET /metrics/co2 requests all return 200', async () => {
    log.step('Step 1 — 5 concurrent GET /metrics/co2');

    log.action('5× GET /metrics/co2 in parallel');
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(API).get('/metrics/co2')),
    );

    for (const res of results) {
      log.http('GET', '/metrics/co2', res.status);
      expect(res.status).toBe(200);
    }
    log.ok('all 5 concurrent requests returned 200');
  });

  // @plan T15.6
  // @covers EOCP-E15-03
  it('Step 2 – all concurrent responses return identical data (no cross-contamination)', async () => {
    log.step('Step 2 — verify concurrent responses are identical');

    log.action('5× GET /metrics/co2 in parallel');
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(API).get('/metrics/co2')),
    );

    const serialized = results.map((r) => JSON.stringify(r.body.data));
    const allSame = serialized.every((s) => s === serialized[0]);
    log.ok(`all responses identical: ${allSame}`);
    expect(allSame).toBe(true);
    log.ok('no cross-contamination between concurrent requests');
  });

  // @plan T15.6
  // @covers EOCP-E15-03
  it('Step 3 – concurrent requests with different groupBy values each return correctly typed items', async () => {
    log.step('Step 3 — concurrent groupBy=project and groupBy=chain');

    log.action('GET /metrics/co2?groupBy=project and ?groupBy=chain in parallel');
    const [projRes, chainRes] = await Promise.all([
      request(API).get('/metrics/co2').query({ groupBy: 'project' }),
      request(API).get('/metrics/co2').query({ groupBy: 'chain' }),
    ]);
    log.http('GET', '/metrics/co2?groupBy=project', projRes.status);
    log.http('GET', '/metrics/co2?groupBy=chain', chainRes.status);
    expect(projRes.status).toBe(200);
    expect(chainRes.status).toBe(200);

    const projItems: Record<string, unknown>[] = projRes.body.data;
    const chainItems: Record<string, unknown>[] = chainRes.body.data;

    for (const item of projItems) {
      expect(item.groupBy).toBe('project');
    }
    for (const item of chainItems) {
      expect(item.groupBy).toBe('chain');
    }
    log.ok('each groupBy response carries the correct groupBy label');
  });
});
