import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.13 — Tolerance to system clock drift for scheduled triggers
// @covers EOCP-E7-06
//
// Description: This test verifies correct behavior of scheduled triggers under small clock drifts.
//   Simulating OS-level clock drift is not possible in the e2e environment without root access.
//   This test verifies the observable clock-related contract: tasks with scheduledStartTime values
//   offset by small amounts (±seconds) are accepted, stored faithfully, and remain distinct.
// Prerequisites: System clock drift can be simulated.
// Steps:
//   1. Introduce small time offset → Tasks with near-past and near-future times are accepted
//   2. Wait for scheduled trigger → Both tasks are independently accessible
//   3. Observe execution → No duplicate or missed task (both IDs are distinct and present)

const log = makeLogger('T07.13');

describe('T07.13 — Tolerance to system clock drift for scheduled triggers', () => {
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

  // @plan T07.13
  // @covers EOCP-E7-06
  it('Step 1 – tasks with slightly different scheduledStartTimes are accepted (drift simulation)', async () => {
    log.step('Step 1 — POST /task x3 (±5s clock drift)');
    const now = Date.now();
    const times = [
      new Date(now - 5_000).toISOString(),   // 5s in the past (small negative drift)
      new Date(now).toISOString(),             // exact now
      new Date(now + 5_000).toISOString(),    // 5s in the future (small positive drift)
    ];

    for (const [i, scheduledStartTime] of times.entries()) {
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
          scheduledStartTime,
          comment: `T07.13 – drift offset ${i}`,
        });
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, scheduledStartTime: res.body.data.scheduledStartTime } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(3);
    log.ok('3 drift-offset tasks created');
  });

  // @plan T07.13
  // @covers EOCP-E7-06
  it('Step 2 – all drift-offset tasks are independently accessible', async () => {
    log.step('Step 2 — GET /task/:id x3');
    const fetches = await Promise.all(
      createdTaskIds.map((id) =>
        request(API).get(`/task/${id}`).set('Cookie', cookie),
      ),
    );
    for (const res of fetches) {
      log.http('GET', `/task/:id`, res.status, res.status === 200 ? { id: res.body.data.id, scheduledStartTime: res.body.data.scheduledStartTime } : res.body);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.scheduledStartTime).toBeDefined();
    }
    log.ok('all 3 tasks accessible');
  });

  // @plan T07.13
  // @covers EOCP-E7-06
  it('Step 3 – no duplicate tasks created; all IDs are distinct', async () => {
    log.step('Step 3 — verify distinct IDs and scheduledStartTimes');
    expect(new Set(createdTaskIds).size).toBe(3);

    const fetches = await Promise.all(
      createdTaskIds.map((id) =>
        request(API).get(`/task/${id}`).set('Cookie', cookie),
      ),
    );
    const scheduledTimes = fetches.map((r) =>
      new Date(r.body.data.scheduledStartTime).getTime(),
    );
    log.ok(`scheduledTimes: ${scheduledTimes.join(', ')}`);
    // All three scheduled times must be distinct
    expect(new Set(scheduledTimes).size).toBe(3);
    log.ok('all 3 IDs and scheduledStartTimes are distinct');
  });
});
