import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T11.9 — Filtering capabilities on API queries
// @covers EOCP-E11-07

const log = makeLogger('T11.9');

describe('T11.9 — Filtering capabilities on API queries', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T11.9
  // @covers EOCP-E11-07
  it('GET /task?status=Edited returns only Edited tasks', async () => {
    log.step('GET /task?status=Edited');
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/task').set('Cookie', cookie).query({ status: 'Edited' });
    log.http('GET', '/task?status=Edited', res.status, { count: res.body.data?.length });
    expect(res.status).toBe(200);
    for (const task of res.body.data as { status: string }[]) {
      expect(task.status).toBe('Edited');
    }
    log.ok('filter by status=Edited works');
  });

  // @plan T11.9
  // @covers EOCP-E11-07
  it('GET /task?kind=Standalone returns only Standalone tasks', async () => {
    log.step('GET /task?kind=Standalone');
    const { cookie } = await asAdminSession();
    const res = await request(API).get('/task').set('Cookie', cookie).query({ kind: 'Standalone' });
    log.http('GET', '/task?kind=Standalone', res.status, { count: res.body.data?.length });
    expect(res.status).toBe(200);
    for (const task of res.body.data as { kind: string }[]) {
      expect(task.kind).toBe('Standalone');
    }
    log.ok('filter by kind=Standalone works');
  });
});
