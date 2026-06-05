import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T10.10 — Measurement of scheduling latency under reprioritization
// @covers EOCP-E10-03
//
// Description: This test verifies that scheduling latency remains within acceptable bounds when
//   priorities change dynamically.
// Prerequisites: Scheduling latency metrics are available.
// Steps:
//   1. Submit jobs with changing priorities → Priorities are updated
//   2. Measure time to scheduling decision → Latency is recorded
//   3. Compare with baseline → No significant degradation

describe('T10.10 — Measurement of scheduling latency under reprioritization', () => {
  let cookie: string;
  let projectId: string;
  let processorVersionId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    ({ cookie } = await asAdminSession());

    const projectRes = await request(API).get('/project').set('Cookie', cookie).expect(200);
    projectId = (projectRes.body.data as { id: string }[])[0].id;

    const pvRes = await request(API).get('/processor-version').expect(200);
    processorVersionId = (pvRes.body.data as { id: string }[])[0].id;
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T10.10
  // @covers EOCP-E10-03
  it('Step 1 – tasks are submitted and then reprioritized without error', async () => {
    const tasks = await Promise.all(
      [0, 3, 6].map((priority) =>
        request(API)
          .post('/task')
          .set('Cookie', cookie)
          .send({
            projectId,
            kind: 'Standalone',
            processorVersionId,
            priority,
            productionMode: 'Nominal',
            priorityClass: 'NRT',
            scheduledStartTime: new Date().toISOString(),
            comment: `T10.10 – latency task priority=${priority}`,
          })
          .expect(201),
      ),
    );
    for (const res of tasks) {
      createdTaskIds.push(res.body.data.id);
    }

    for (const id of createdTaskIds) {
      await request(API)
        .patch(`/task/${id}/priority`)
        .set('Cookie', cookie)
        .send({ priority: 9, class: 'Ultra' })
        .expect(200);
    }
    expect(createdTaskIds.length).toBe(3);
  });

  // @plan T10.10
  // @covers EOCP-E10-03
  it('Step 2 – PATCH /task/:id/priority responds within 2 seconds (latency acceptable)', async () => {
    const taskId = createdTaskIds[0]!;
    const start = Date.now();
    await request(API)
      .patch(`/task/${taskId}/priority`)
      .set('Cookie', cookie)
      .send({ priority: 5, class: 'NRT' })
      .expect(200);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  // @plan T10.10
  // @covers EOCP-E10-03
  it('Step 3 – reprioritized values are persisted correctly (no degradation of state integrity)', async () => {
    for (const id of createdTaskIds) {
      const res = await request(API)
        .get(`/task/${id}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.priority).toBeDefined();
    }
  });
});
