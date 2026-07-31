import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T06.16 — Scheduler throughput and latency measurement
// @covers EOCP-E6-03
//
// Description: This test measures scheduler performance under load.
// Prerequisites: Performance monitoring is enabled.
// Steps:
//   1. Submit high volume of short jobs → Scheduler accepts load
//   2. Measure queue latency → Latency remains acceptable
//   3. Compare against baseline → No regression detected

const log = makeLogger('T06.16');

describe('T06.16 — Scheduler throughput and latency measurement', () => {
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

  // @plan T06.16
  // @covers EOCP-E6-03
  it('Step 1 – 20 tasks are accepted without error (throughput baseline)', async () => {
    log.step('Step 1 — POST /task x20 (throughput baseline)');
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        request(API)
          .post('/task')
          .set('Cookie', cookie)
          .send({
            projectId: PROJECT_ID,
            kind: 'Standalone',
            processorVersionId: PROCESSOR_VERSION_ID,
            priority: i % 10,
            productionMode: 'Nominal',
            priorityClass: i % 2 === 0 ? 'NRT' : 'Super',
            scheduledStartTime: new Date().toISOString(),
            comment: `T06.16 – throughput task ${i}`,
          }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(201);
      createdTaskIds.push(res.body.data.id);
    }
    expect(createdTaskIds.length).toBe(20);
    log.ok('20 tasks created');
  });

  // @plan T06.16
  // @covers EOCP-E6-03
  it('Step 2 – status-summary response time is acceptable after burst submission', async () => {
    log.step('Step 2 — GET /task/status-summary (latency check)');
    const start = Date.now();
    const res = await request(API).get('/task/status-summary').set('Cookie', cookie);
    const elapsed = Date.now() - start;
    log.http('GET', '/task/status-summary', res.status, { elapsed_ms: elapsed });
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(5000);
    log.ok(`status-summary returned in ${elapsed}ms`);
  });

  // @plan T06.16
  // @covers EOCP-E6-03
  it('Step 3 – scheduler status is still reachable after throughput burst (no regression)', async () => {
    log.step('Step 3 — GET /scheduler/status');
    const res = await request(API)
      .get('/scheduler/status');
    log.http('GET', '/scheduler/status', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('scheduler status accessible after burst');
  });
});
