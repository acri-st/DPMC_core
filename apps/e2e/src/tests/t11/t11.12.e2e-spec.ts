import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.12 — Consistency of API responses during failures
// @covers EOCP-E11-01

const NULL_UUID = 0;

const log = makeLogger('T11.12');

describe('T11.12 — Consistency of API responses during failures', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T11.12
  // @covers EOCP-E11-01
  it('Step 1 & 2 – GET /task/<unknown-uuid> returns 404 with statusCode + message', async () => {
    log.step(`Step 1&2 — GET /task/${NULL_UUID}`);
    const res = await request(API).get(`/task/${NULL_UUID}`).set('Cookie', cookie);
    log.http('GET', `/task/${NULL_UUID}`, res.status, res.body);
    expect(res.status).toBe(404);
    const body = res.body as Record<string, unknown>;
    expect(body.statusCode ?? body.message ?? body.error ?? body.errors).toBeTruthy();
    log.ok('404 with structured body');
  });

  // @plan T11.12
  // @covers EOCP-E11-01
  it('Step 2 – POST /task with empty body returns 4xx with a structured body', async () => {
    log.step('Step 2 — POST /task (empty body)');
    const res = await request(API).post('/task').set('Cookie', cookie).send({});
    log.http('POST', '/task', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = res.body as Record<string, unknown>;
    expect(body.statusCode ?? body.message ?? body.error ?? body.errors).toBeTruthy();
    log.ok(`empty body rejected: ${res.status}`);
  });

  // @plan T11.12
  // @covers EOCP-E11-01
  it('Step 3 – GET /task returns 200 after prior failure conditions', async () => {
    log.step('Step 3 — GET /task (recovery check)');
    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    log.ok('API stable after failure conditions');
  });

  // @plan T11.12
  // @covers EOCP-E11-01
  it('Step 3 – GET /host returns 200 after prior failure conditions', async () => {
    log.step('Step 3 — GET /host (recovery check)');
    const res = await request(API).get('/host').set('Cookie', cookie);
    log.http('GET', '/host', res.status);
    expect(res.status).toBe(200);
    log.ok('host endpoint stable');
  });
});
