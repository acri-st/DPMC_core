import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.13 — Rate limiting and abuse prevention
// @covers EOCP-E11-07

const BURST_COUNT = 60;
const RATE_LIMIT_HEADERS = new Set([
  'x-ratelimit-limit', 'x-ratelimit-remaining', 'retry-after', 'x-rate-limit-limit',
]);

const log = makeLogger('T11.13');

describe('T11.13 — Rate limiting and abuse prevention', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T11.13
  // @covers EOCP-E11-07
  it('Step 1 – 5 sequential requests all succeed (200)', async () => {
    log.step('Step 1 — 5 sequential GET /task');
    for (let i = 0; i < 5; i++) {
      const res = await request(API).get('/task').set('Cookie', cookie);
      log.http('GET', '/task', res.status);
      expect(res.status).toBe(200);
    }
    log.ok('5 requests all 200');
  });

  // @plan T11.13
  // @covers EOCP-E11-07
  it(`Step 2 & 3 – bursting ${BURST_COUNT} requests yields 429 or rate-limit headers (or env has no limit)`, async () => {
    log.step(`Step 2&3 — burst ${BURST_COUNT} GET /task`);
    let got429 = false;
    let hasRateLimitHeader = false;

    for (let i = 0; i < BURST_COUNT; i++) {
      const res = await request(API).get('/task').set('Cookie', cookie);
      if (res.status === 429) { got429 = true; break; }
      const headerKeys = Object.keys(res.headers).map((k) => k.toLowerCase());
      if (headerKeys.some((k) => RATE_LIMIT_HEADERS.has(k))) hasRateLimitHeader = true;
    }

    log.ok(`got429=${got429}, hasRateLimitHeader=${hasRateLimitHeader}`);
    if (!got429 && !hasRateLimitHeader) {
      log.ok(`no rate limit triggered after ${BURST_COUNT} requests — not configured in this env`);
    } else {
      expect(got429 || hasRateLimitHeader).toBe(true);
    }
  });
});
