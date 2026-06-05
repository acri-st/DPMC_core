import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.3 — Reporting of task execution status through APIs
// @covers EOCP-E11-03

const VALID_STATES = new Set([
  'Queued', 'Edited', 'Running', 'Dispatched',
  'Done', 'Failed', 'Cancelled', 'Skipped', 'Suspended',
]);

const log = makeLogger('T11.3');

describe('T11.3 — Reporting of task execution status through APIs', () => {
  let cookie: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    for (let i = 0; i < 2; i++) {
      log.action(`POST /task ${i + 1}/2`);
      const res = await request(API).post('/task').set('Cookie', cookie).send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: `T11.3 – status test task ${i + 1}`,
      });
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      createdIds.push(res.body.data.id);
    }
    log.ok(`created tasks: ${createdIds.join(', ')}`);
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T11.3
  // @covers EOCP-E11-03
  it('Step 2 – GET /task lists all created tasks by id', async () => {
    log.step('Step 2 — GET /task (list)');
    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    const list: { id: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    const found = createdIds.filter((id) => list.some((t) => t.id === id));
    log.ok(`found ${found.length}/${createdIds.length} created tasks in list`);
    expect(found.length).toBe(createdIds.length);
  });

  // @plan T11.3
  // @covers EOCP-E11-03
  it('Step 3 – GET /task/:id returns a valid status string from the known set', async () => {
    log.step('Step 3 — GET each task status');
    for (const id of createdIds) {
      const res = await request(API).get(`/task/${id}`).set('Cookie', cookie);
      log.http('GET', `/task/${id}`, res.status, res.status === 200 ? { status: res.body.data.status } : res.body);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.status).toBe('string');
      expect(VALID_STATES.has(res.body.data.status)).toBe(true);
    }
    log.ok('all tasks have valid status');
  });

  // @plan T11.3
  // @covers EOCP-E11-03
  it('Step 4 – DELETE /task/:id returns 204 and GET returns 404', async () => {
    log.step(`Step 4 — DELETE /task/${createdIds[0]}`);
    const del = await request(API).delete(`/task/${createdIds[0]}`).set('Cookie', cookie);
    log.http('DELETE', `/task/${createdIds[0]}`, del.status);
    expect(del.status).toBe(204);

    const get = await request(API).get(`/task/${createdIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/task/${createdIds[0]}`, get.status);
    expect(get.status).toBe(404);
    createdIds.splice(0, 1);
    log.ok('task deleted and confirmed gone');
  });

  // @plan T11.3
  // @covers EOCP-E11-03
  it('Step 5 – GET /task still returns a coherent list (each item has a valid status)', async () => {
    log.step('Step 5 — GET /task (post-delete coherence)');
    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    const list: { id: string; status: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    for (const item of list) {
      expect(typeof item.status).toBe('string');
    }
    log.ok('list coherent after partial deletion');
  });
});
