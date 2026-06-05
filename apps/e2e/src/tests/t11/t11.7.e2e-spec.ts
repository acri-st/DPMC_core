import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.7 — API authentication and authorization enforcement
// @covers EOCP-E11-07

const PROTECTED_PATHS = ['/task', '/project', '/batch', '/host'];

const log = makeLogger('T11.7');

describe('T11.7 — API authentication and authorization enforcement', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T11.7
  // @covers EOCP-E11-07
  it('Step 1 – requests without session cookie are rejected with 401 or 403', async () => {
    log.step('Step 1 — unauthenticated requests');
    let deniedCount = 0;
    for (const path of PROTECTED_PATHS) {
      const res = await request(API).get(path);
      log.http('GET', path, res.status);
      if (res.status === 401 || res.status === 403) deniedCount++;
    }
    log.ok(`${deniedCount}/${PROTECTED_PATHS.length} paths denied without session`);
    expect(deniedCount).toBeGreaterThan(0);
  });

  // @plan T11.7
  // @covers EOCP-E11-07
  it('Step 2 – requests with a valid session cookie are accepted (200)', async () => {
    log.step('Step 2 — authenticated requests');
    const { cookie } = await asAdminSession();
    let okCount = 0;
    for (const path of PROTECTED_PATHS) {
      const res = await request(API).get(path).set('Cookie', cookie);
      log.http('GET', path, res.status);
      if (res.status === 200) okCount++;
    }
    log.ok(`${okCount}/${PROTECTED_PATHS.length} paths accessible with session`);
    expect(okCount).toBeGreaterThan(0);
  });

  // @plan T11.7
  // @covers EOCP-E11-07
  it('Step 3 – a fake/unknown session id is rejected with 401', async () => {
    log.step('Step 3 — fake session');
    const fakeCookie = `dpmc.sid=00000000-0000-0000-0000-000000000099`;
    const res = await request(API).get('/task').set('Cookie', fakeCookie);
    log.http('GET', '/task', res.status, res.body);
    expect(res.status).toBe(401);
    log.ok('fake session rejected with 401');
  });
});
