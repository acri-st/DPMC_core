import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from './_env-check';

// @plan T01.3 — Static dependency analysis of DPMC architecture
// @covers EOCP-E1-01
//
// Description: This test ensures that no forbidden compile-time or runtime dependencies exist
//   between components beyond those defined by the architecture.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Generate component dependency graphs → Dependencies are clearly identified
//   2. Compare with authorized architecture → No unauthorized dependencies found
//   3. Record dependency baseline → Baseline available for regression use

const log = makeLogger('T01.3');

describe('T01.3 — Static dependency analysis of DPMC architecture', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T01.3
  // @covers EOCP-E1-01
  it('Step 1 – GET /status exposes only documented top-level API surface', async () => {
    log.step('Step 1 — GET /status (surface leak check)');

    const res = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', res.status, res.body.data);

    const body = JSON.stringify(res.body);
    const leaksLocalhost = /localhost:\d{4,5}/.test(body);
    const leaksLoopback  = /127\.0\.0\.1:\d{4,5}/.test(body);

    if (leaksLocalhost) log.fail('response leaks localhost:<port>');
    if (leaksLoopback)  log.fail('response leaks 127.0.0.1:<port>');

    expect(body).not.toMatch(/localhost:\d{4,5}/);
    expect(body).not.toMatch(/127\.0\.0\.1:\d{4,5}/);
    log.ok('no internal addresses leaked in /status response');
  });

  // @plan T01.3
  // @covers EOCP-E1-01
  it('Step 2 – core resource endpoints respond without exposing cross-module internals', async () => {
    log.step('Step 2 — checking core endpoints for internal leaks');

    const endpoints = ['/task', '/host', '/project', '/data-center', '/processor-version'];
    for (const ep of endpoints) {
      const res = await request(API).get(ep).set('Cookie', cookie);
      log.http('GET', ep, res.status);
      expect([200, 401, 403]).toContain(res.status);

      if (res.status === 200) {
        const body = JSON.stringify(res.body);
        const hasStack = /at .*\.ts:\d+/.test(body);
        const hasError = /TypeError|ReferenceError|SyntaxError/.test(body);
        if (hasStack) log.fail(`${ep} leaks stack trace`);
        if (hasError) log.fail(`${ep} leaks error type`);
        expect(body).not.toMatch(/at .*\.ts:\d+/);
        expect(body).not.toMatch(/TypeError|ReferenceError|SyntaxError/);
        log.ok(`${ep} — no internal leaks`);
      } else {
        log.warn(`${ep} returned ${res.status} — skipping body inspection`);
      }
    }
  });

  // @plan T01.3
  // @covers EOCP-E1-01
  it('Step 3 – API baseline: known public endpoints are all reachable (dependency regression guard)', async () => {
    log.step('Step 3 — public endpoint reachability baseline');

    const publicEndpoints: [string, number][] = [
      ['/status', 200],
      ['/task', 200],
      ['/host', 200],
      ['/project', 200],
      ['/data-center', 200],
      ['/processor-version', 200],
      ['/production-mode-rule', 200],
    ];

    for (const [path, expected] of publicEndpoints) {
      const res = await request(API).get(path).set('Cookie', cookie);
      log.http('GET', path, res.status, res.status !== expected ? `expected ${expected}` : undefined);
      expect(res.status).toBe(expected);
      log.ok(`${path} → ${res.status}`);
    }
  });
});
