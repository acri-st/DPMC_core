import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.8 — Pagination support on list endpoints
// @covers EOCP-E11-07

const log = makeLogger('T11.8');

describe('T11.8 — Pagination support on list endpoints', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T11.8
  // @covers EOCP-E11-07
  it('GET /task?page=1&pageSize=2 returns at most 2 items with X-Total-Count header', async () => {
    log.step('GET /task?page=1&pageSize=2');
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/task').set('Cookie', cookie).query({ page: 1, pageSize: 2 });
    log.http('GET', '/task?page=1&pageSize=2', res.status, { count: res.body.data?.length, xTotalCount: res.headers['x-total-count'] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.headers['x-total-count']).toBeDefined();
    log.ok(`pagination honored: ${res.body.data.length} items, X-Total-Count=${res.headers['x-total-count']}`);
  });
});
