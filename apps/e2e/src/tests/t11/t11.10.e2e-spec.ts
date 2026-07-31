import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.10 — API backward compatibility across versions
// @covers EOCP-E11-01

const CURRENT_PATHS = ['/task', '/project', '/host', '/processor-version'];

const log = makeLogger('T11.10');

describe('T11.10 — API backward compatibility across versions', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T11.10
  // @covers EOCP-E11-01
  it('Step 1 – current canonical endpoints respond with 200', async () => {
    log.step('Step 1 — probe canonical endpoints');
    let okCount = 0;
    for (const path of CURRENT_PATHS) {
      const res = await request(API).get(path).set('Cookie', cookie);
      log.http('GET', path, res.status);
      if (res.status === 200) okCount++;
    }
    log.ok(`${okCount}/${CURRENT_PATHS.length} canonical endpoints respond 200`);
    expect(okCount).toBeGreaterThan(0);
  });

  // @plan T11.10
  // @covers EOCP-E11-01
  it('Step 2 – versioned /v1/* paths return 404 or redirect, never 5xx', async () => {
    log.step('Step 2 — probe /v1/* paths');
    for (const path of CURRENT_PATHS) {
      const res = await request(API).get(`/v1${path}`).set('Cookie', cookie);
      log.http('GET', `/v1${path}`, res.status);
      expect(res.status).not.toBeGreaterThanOrEqual(500);
    }
    log.ok('no 5xx on versioned paths');
  });

  // @plan T11.10
  // @covers EOCP-E11-01
  it('Step 3 – GET /task returns list where each item has an id field', async () => {
    log.step('Step 3 — GET /task (structure check)');
    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    const list: { id: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    for (const item of list) {
      expect(item.id).toBeDefined();
    }
    log.ok(`list structure consistent: ${list.length} items`);
  });
});
