import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T15.5 — Crossvalidation of footprint metrics with system counters
// @covers EOCP-E15-02
//
// Description: Verifies that the Prometheus /metrics endpoint exposes DPMC-specific gauges
//   alongside standard Node.js process metrics, enabling cross-validation with OS-level counters.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.5');

describe('T15.5 — Crossvalidation of footprint metrics with system counters', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T15.5
  // @covers EOCP-E15-02
  it('Step 1 – GET /metrics exposes standard process metrics (process_cpu_seconds_total)', async () => {
    log.step('Step 1 — GET /metrics (process CPU counter)');

    log.action('GET /metrics');
    const res = await request(API).get('/metrics');
    log.http('GET', '/metrics', res.status, { length: res.text?.length });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/process_cpu_seconds_total/);
    log.ok('process_cpu_seconds_total present');
  });

  // @plan T15.5
  // @covers EOCP-E15-02
  it('Step 2 – GET /metrics exposes nodejs_heap metrics enabling memory cross-validation', async () => {
    log.step('Step 2 — GET /metrics (heap memory metrics)');

    log.action('GET /metrics');
    const res = await request(API).get('/metrics');
    log.http('GET', '/metrics', res.status, { length: res.text?.length });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(
      /nodejs_heap_size_used_bytes|process_resident_memory_bytes/,
    );
    log.ok('memory metric present for cross-validation');
  });

  // @plan T15.5
  // @covers EOCP-E15-02
  it('Step 3 – dpmc_co2_grams gauge is present and parseable as a numeric value', async () => {
    log.step('Step 3 — GET /metrics (dpmc_co2_grams parseable)');

    log.action('GET /metrics');
    const res = await request(API).get('/metrics');
    log.http('GET', '/metrics', res.status, { length: res.text?.length });
    expect(res.status).toBe(200);

    expect(res.text).toContain('dpmc_co2_grams');

    // Find all dpmc_co2_grams lines that carry a numeric value
    const valueLines = res.text
      .split('\n')
      .filter(
        (line) => line.startsWith('dpmc_co2_grams') && !line.startsWith('#'),
      );

    if (valueLines.length === 0) {
      log.ok('no project data yet — gauge defined but no label values emitted');
      return;
    }

    for (const line of valueLines) {
      const parts = line.split(' ');
      const value = parseFloat(parts[parts.length - 1] ?? '');
      expect(isNaN(value)).toBe(false);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    log.ok(
      `${valueLines.length} dpmc_co2_grams value(s) are valid non-negative numbers`,
    );
  });
});
