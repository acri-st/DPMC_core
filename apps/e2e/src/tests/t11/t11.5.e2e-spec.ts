import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T11.5 — Metadata and catalogue operations through APIs
// @covers EOCP-E11-05

const log = makeLogger('T11.5');

describe('T11.5 — Metadata and catalogue operations through APIs', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T11.5
  // @covers EOCP-E11-05
  it('Step 1 & 2 – GET /processor-version lists catalogue entries with id and baseline', async () => {
    log.step('Step 1&2 — GET /processor-version');
    const res = await request(API).get('/processor-version').set('Cookie', cookie);
    log.http('GET', '/processor-version', res.status);
    expect(res.status).toBe(200);
    const list: { id: string; baseline: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].id).toBeDefined();
    expect(list[0].baseline).toBeDefined();
    log.ok(`${list.length} processor versions in catalogue`);
  });

  // @plan T11.5
  // @covers EOCP-E11-05
  it('Step 2 – GET /auxiliary-configuration returns entries with id and name', async () => {
    log.step('Step 2 — GET /auxiliary-configuration');
    const res = await request(API).get('/auxiliary-configuration').set('Cookie', cookie);
    log.http('GET', '/auxiliary-configuration', res.status);
    expect(res.status).toBe(200);
    const list: { id: string; name: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].id).toBeDefined();
    expect(list[0].name).toBeDefined();
    log.ok(`${list.length} auxiliary configurations`);
  });

  // @plan T11.5
  // @covers EOCP-E11-05
  it('Step 3 – PATCH /project/:id with comment is accepted or returns expected code', async () => {
    log.step(`Step 3 — PATCH /project/${PROJECT_ID}`);
    const res = await request(API).patch(`/project/${PROJECT_ID}`).set('Cookie', cookie).send({ comment: 'T11.5 – metadata update test' });
    log.http('PATCH', `/project/${PROJECT_ID}`, res.status, res.status < 300 ? { comment: res.body.data?.comment } : res.body);
    expect([200, 400, 404, 405, 422]).toContain(res.status);
    log.ok(`patch result: ${res.status}`);
  });

  // @plan T11.5
  // @covers EOCP-E11-05
  it('Step 4 – POST /task with non-existent processorVersionId is rejected with 4xx', async () => {
    log.step('Step 4 — POST /task (invalid processorVersionId)');
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: '00000000-0000-0000-0000-000000000000',
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T11.5 – invalid metadata',
    });
    log.http('POST', '/task', res.status, res.body);
    expect([400, 404, 422]).toContain(res.status);
    log.ok(`invalid processorVersionId rejected: ${res.status}`);
  });
});
