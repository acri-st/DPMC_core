import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.15 — API robustness to malformed requests
// @covers EOCP-E11-02

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-0000000000ff';

const log = makeLogger('T11.15');

describe('T11.15 — API robustness to malformed requests', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T11.15
  // @covers EOCP-E11-02
  it('GET /task/<unknown-uuid> returns 404 with structured body', async () => {
    log.step(`GET /task/${NON_EXISTENT_UUID}`);
    const { cookie } = await asAdminSession();
    const res = await request(API).get(`/task/${NON_EXISTENT_UUID}`).set('Cookie', cookie);
    log.http('GET', `/task/${NON_EXISTENT_UUID}`, res.status, res.body);
    expect(res.status).toBe(404);
    const body = res.body as Record<string, unknown>;
    expect(body.statusCode).toBe(404);
    expect(typeof body.message).toBe('string');
    log.ok('404 with statusCode and message');
  });

  // @plan T11.15
  // @covers EOCP-E11-02
  it('GET /task/<malformed-id> returns 4xx, never 5xx', async () => {
    log.step('GET /task/not-a-uuid');
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/task/not-a-uuid').set('Cookie', cookie);
    log.http('GET', '/task/not-a-uuid', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`malformed id rejected: ${res.status}`);
  });
});
