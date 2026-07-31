import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.16 — Performance and stability of APIs under load
// @covers EOCP-E11-01

const CONCURRENCY = 10;
const REQUESTS_EACH = 5;
const MAX_P95_MS = 5000;
const MAX_ERROR_RATE = 0.2;

const log = makeLogger('T11.16');

describe('T11.16 — Performance and stability of APIs under load', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T11.16
  // @covers EOCP-E11-01
  it(`fires ${CONCURRENCY}×${REQUESTS_EACH} concurrent GET /task with p95 ≤ ${MAX_P95_MS}ms and error rate ≤ ${MAX_ERROR_RATE * 100}%`, async () => {
    log.step(`${CONCURRENCY}×${REQUESTS_EACH} concurrent GET /task`);

    const workerFn = async (): Promise<{ status: number; durationMs: number }[]> => {
      const results = [];
      for (let i = 0; i < REQUESTS_EACH; i++) {
        const t0 = Date.now();
        const res = await request(API).get('/task').set('Cookie', cookie);
        results.push({ status: res.status, durationMs: Date.now() - t0 });
      }
      return results;
    };

    const allResults = (await Promise.all(Array.from({ length: CONCURRENCY }, workerFn))).flat();
    const durations = allResults.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const errors = allResults.filter((r) => r.status < 200 || r.status >= 400).length;
    const errorRate = errors / allResults.length;

    log.ok(`p95=${p95}ms  errors=${errors}/${allResults.length} (${(errorRate * 100).toFixed(1)}%)`);
    expect(p95).toBeLessThanOrEqual(MAX_P95_MS);
    expect(errorRate).toBeLessThanOrEqual(MAX_ERROR_RATE);
  });
});
