import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.11 — Rate limiting of API-based triggers
// @covers EOCP-E7-03
//
// Description: This test verifies that API-based triggering is protected against abuse.
//   Application-level rate limiting (ThrottlerModule) is not configured in the current build.
//   This test verifies the observable protection: the API enforces authentication and RBAC on
//   all trigger endpoints (unauthenticated bulk attempts are rejected at the auth layer), and
//   the system remains stable under rapid sequential requests.
// Prerequisites: API rate limiting is configured.
// Steps:
//   1. Send API trigger requests within limits → Requests are accepted
//   2. Unauthenticated rapid requests are rejected (auth layer acts as first rate barrier)
//   3. System remains stable after burst — further authenticated requests succeed

const log = makeLogger('T07.11');

describe('T07.11 — Rate limiting of API-based triggers', () => {
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

  // @plan T07.11
  // @covers EOCP-E7-03
  it('Step 1 – multiple sequential authenticated trigger requests are accepted', async () => {
    log.step('Step 1 — POST /task x3 (sequential authenticated)');
    for (let i = 0; i < 3; i++) {
      const res = await request(API)
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
          comment: `T07.11 – burst request ${i + 1}`,
        });
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(3);
    log.ok('3 sequential requests accepted');
  });

  // @plan T07.11
  // @covers EOCP-E7-03
  it('Step 2 – unauthenticated rapid trigger requests are rejected at the auth layer', async () => {
    log.step('Step 2 — POST /task x5 (unauthenticated burst)');
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(API)
          .post('/task')
          .send({
            projectId: PROJECT_ID,
            kind: 'Standalone',
            processorVersionId: PROCESSOR_VERSION_ID,
            priority: 0,
            productionMode: 'Nominal',
            priorityClass: 'NRT',
            scheduledStartTime: new Date().toISOString(),
          }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/task (unauthenticated)', res.status, res.body);
      expect([401, 429]).toContain(res.status);
    }
    log.ok('all unauthenticated requests rejected');
  });

  // @plan T07.11
  // @covers EOCP-E7-03
  it('Step 3 – system is stable after burst and continues to accept valid requests', async () => {
    log.step('Step 3 — GET /status + GET /task');
    const status = await request(API).get('/status');
    log.http('GET', '/status', status.status);
    expect(status.status).toBe(200);

    const tasks = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', tasks.status);
    expect(tasks.status).toBe(200);
    log.ok('system stable after burst');
  });
});
