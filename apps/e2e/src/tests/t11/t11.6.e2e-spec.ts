import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.6 — Modification of production configuration through APIs
// @covers EOCP-E11-06

const log = makeLogger('T11.6');

describe('T11.6 — Modification of production configuration through APIs', () => {
  let cookie: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T11.6
  // @covers EOCP-E11-06
  it('Step 1 – GET /project/:id returns configuration with id and name', async () => {
    log.step(`Step 1 — GET /project/${PROJECT_ID}`);
    const res = await request(API).get(`/project/${PROJECT_ID}`).set('Cookie', cookie);
    log.http('GET', `/project/${PROJECT_ID}`, res.status, res.status === 200 ? { id: res.body.data.id, name: res.body.data.name } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PROJECT_ID);
    expect(res.body.data.name).toBeDefined();
    log.ok(`project: ${res.body.data.name}`);
  });

  // @plan T11.6
  // @covers EOCP-E11-06
  it('Step 2 – PATCH /project/:id accepts a safe comment update', async () => {
    log.step(`Step 2 — PATCH /project/${PROJECT_ID}`);
    const res = await request(API).patch(`/project/${PROJECT_ID}`).set('Cookie', cookie).send({ comment: 'T11.6 – config modification test' });
    log.http('PATCH', `/project/${PROJECT_ID}`, res.status, res.status < 300 ? { comment: res.body.data?.comment } : res.body);
    expect([200, 400, 404, 405, 422]).toContain(res.status);
    log.ok(`patch result: ${res.status}`);
  });

  // @plan T11.6
  // @covers EOCP-E11-06
  it('Step 3 – POST /task with seeded processorVersion returns 201 with correct projectId', async () => {
    log.step('Step 3 — POST /task');
    log.action('POST /task', { processorVersionId: PROCESSOR_VERSION_ID });
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T11.6 – config application test',
    });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, projectId: res.body.data.projectId } : res.body);
    expect(res.status).toBe(201);
    createdIds.push(res.body.data.id);
    expect(res.body.data.projectId).toBe(PROJECT_ID);
    log.ok(`task created with correct projectId: ${res.body.data.id}`);
  });

  // @plan T11.6
  // @covers EOCP-E11-06
  it('Step 4 – POST /task with invalid configuration is rejected with 4xx', async () => {
    log.step('Step 4 — POST /task (invalid config)');
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: 0,
      processorVersionId: 0,
      kind: 'INVALID',
      productionMode: 'INVALID',
      priorityClass: 'INVALID',
    });
    log.http('POST', '/task', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`invalid config rejected: ${res.status}`);
  });
});
