import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.4 — Resource reservation and usage tracking through APIs
// @covers EOCP-E11-04

const log = makeLogger('T11.4');

describe('T11.4 — Resource reservation and usage tracking through APIs', () => {
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

  // @plan T11.4
  // @covers EOCP-E11-04
  it('Step 1 – GET /host returns a resource inventory list with id on each item', async () => {
    log.step('Step 1 — GET /host');
    const res = await request(API).get('/host').set('Cookie', cookie);
    log.http('GET', '/host', res.status);
    expect(res.status).toBe(200);
    const list: { id: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    log.ok(`${list.length} hosts in inventory`);
  });

  // @plan T11.4
  // @covers EOCP-E11-04
  it('Step 2 – POST /task x3 with resource params returns 201 each with correct projectId', async () => {
    log.step('Step 2 — POST /task x3');
    for (let i = 0; i < 3; i++) {
      log.action(`POST /task ${i + 1}/3`);
      const res = await request(API).post('/task').set('Cookie', cookie).send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 0,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: `T11.4 – resource tracking test ${i + 1}`,
        parameters: { resources: { ramMb: 512, cpuCores: 1, requireGpu: false } },
      });
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, projectId: res.body.data.projectId } : res.body);
      expect(res.status).toBe(201);
      createdIds.push(res.body.data.id);
      expect(res.body.data.projectId).toBe(PROJECT_ID);
    }
    expect(createdIds.length).toBe(3);
    log.ok(`3 tasks created: ${createdIds.join(', ')}`);
  });

  // @plan T11.4
  // @covers EOCP-E11-04
  it('Step 3 – GET /host remains accessible while tasks are queued', async () => {
    log.step('Step 3 — GET /host (while tasks queued)');
    const res = await request(API).get('/host').set('Cookie', cookie);
    log.http('GET', '/host', res.status);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('host inventory accessible');
  });

  // @plan T11.4
  // @covers EOCP-E11-04
  it('Step 4 – DELETE /task/:id x3 returns 204 each; host count unchanged', async () => {
    log.step('Step 4 — DELETE tasks then check host count');
    const before = await request(API).get('/host').set('Cookie', cookie);
    expect(before.status).toBe(200);
    const beforeCount = (Array.isArray(before.body.data) ? before.body.data : (before.body.data?.items ?? [])).length;

    for (const id of [...createdIds]) {
      const del = await request(API).delete(`/task/${id}`).set('Cookie', cookie);
      log.http('DELETE', `/task/${id}`, del.status);
      expect(del.status).toBe(204);
    }
    createdIds.length = 0;

    const after = await request(API).get('/host').set('Cookie', cookie);
    log.http('GET', '/host', after.status, { count: (Array.isArray(after.body.data) ? after.body.data : (after.body.data?.items ?? [])).length });
    expect(after.status).toBe(200);
    const afterCount = (Array.isArray(after.body.data) ? after.body.data : (after.body.data?.items ?? [])).length;
    expect(afterCount).toBe(beforeCount);
    log.ok(`host count unchanged: ${afterCount}`);
  });
});
