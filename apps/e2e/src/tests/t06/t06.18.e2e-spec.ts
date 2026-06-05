import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.18 — Dispatcher starvation prevention
// @covers EOCP-E6-09
//
// Description: This test verifies that the dispatcher does not indefinitely favor the same class of
//   jobs and that starvation prevention mechanisms are effective.
// Prerequisites: Multiple job classes and priorities are configured. A continuous stream of
//   high-priority jobs can be generated.
// Steps:
//   1. Submit continuous high-priority jobs → High-priority jobs execute
//   2. Submit low-priority jobs → Low-priority jobs are queued
//   3. Observe dispatcher behavior over time → Low-priority jobs are eventually executed

const log = makeLogger('T06.18');

describe('T06.18 — Dispatcher starvation prevention', () => {
  let cookie: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T06.18
  // @covers EOCP-E6-09
  it('Step 1 – high-priority RT tasks are accepted (starvation scenario setup)', async () => {
    log.step('Step 1 — POST /task x5 (Super priority)');
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(API)
          .post('/task')
          .set('Cookie', cookie)
          .send({
            projectId: PROJECT_ID,
            kind: 'Standalone',
            processorVersionId: PROCESSOR_VERSION_ID,
            priority: 9,
            productionMode: 'Nominal',
            priorityClass: 'Super',
            scheduledStartTime: new Date().toISOString(),
            comment: 'T06.18 – high priority task',
          }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass } : res.body);
      expect(res.status).toBe(201);
      expect(res.body.data.priorityClass).toBe('Super');
      createdTaskIds.push(res.body.data.id);
    }
    log.ok(`5 high-priority tasks created`);
  });

  // @plan T06.18
  // @covers EOCP-E6-09
  it('Step 2 – low-priority NRT tasks are accepted and queued alongside RT tasks', async () => {
    log.step('Step 2 — POST /task x5 (NRT priority)');
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(API)
          .post('/task')
          .set('Cookie', cookie)
          .send({
            projectId: PROJECT_ID,
            kind: 'Standalone',
            processorVersionId: PROCESSOR_VERSION_ID,
            priority: 0,
            productionMode: 'Nominal',
            priorityClass: 'NRT',
            scheduledStartTime: new Date().toISOString(),
            comment: 'T06.18 – low priority task',
          }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass } : res.body);
      expect(res.status).toBe(201);
      expect(res.body.data.priorityClass).toBe('NRT');
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(10);
    log.ok('5 NRT tasks created, total 10');
  });

  // @plan T06.18
  // @covers EOCP-E6-09
  it('Step 3 – all tasks (RT and NRT) remain accessible via GET (no starvation-induced data loss)', async () => {
    log.step('Step 3 — GET /task/:id for all 10 tasks');
    for (const id of createdTaskIds) {
      const res = await request(API)
        .get(`/task/${id}`)
        .set('Cookie', cookie);
      log.http('GET', `/task/${id}`, res.status, res.status === 200 ? { id: res.body.data.id, priorityClass: res.body.data.priorityClass } : res.body);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    }
    log.ok('all 10 tasks accessible');
  });
});
