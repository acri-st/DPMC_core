import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T10.11 — Rejection of invalid priority values
// @covers EOCP-E10-02
//
// Description: This test verifies that invalid or out-of-range priority values are rejected.
// Prerequisites: Priority validation rules are enforced.
// Steps:
//   1. Configure a job with invalid priority → Validation is triggered
//   2. Submit the job → Job is rejected
//   3. Inspect error message → Priority error is clearly reported

describe('T10.11 — Rejection of invalid priority values', () => {
  let cookie: string;
  let projectId: string;
  let processorVersionId: string;

  beforeAll(async () => {
    ({ cookie } = await asAdminSession());

    const projectRes = await request(API).get('/project').set('Cookie', cookie).expect(200);
    projectId = (projectRes.body.data as { id: string }[])[0].id;

    const pvRes = await request(API).get('/processor-version').expect(200);
    processorVersionId = (pvRes.body.data as { id: string }[])[0].id;
  });

  // @plan T10.11
  // @covers EOCP-E10-02
  it('Step 1 – task with a non-integer priority value is rejected (400)', async () => {
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId,
        priority: 3.7,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.11 – non-integer priority',
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  // @plan T10.11
  // @covers EOCP-E10-02
  it('Step 2 – PATCH /task/:id/priority with an invalid priorityClass is rejected', async () => {
    const createRes = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId,
        priority: 2,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.11 – base task for invalid PATCH',
      })
      .expect(201);
    const taskId = createRes.body.data.id;

    const patchRes = await request(API)
      .patch(`/task/${taskId}/priority`)
      .set('Cookie', cookie)
      .send({ priority: 5, class: 'INVALID_CLASS' });
    expect(patchRes.status).toBeGreaterThanOrEqual(400);
    expect(patchRes.status).toBeLessThan(500);

    await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
  });

  // @plan T10.11
  // @covers EOCP-E10-02
  it('Step 3 – error response for invalid priority is structured (no stack trace)', async () => {
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId,
        priority: 'not-a-number',
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.11 – string priority error check',
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = res.body as Record<string, unknown>;
    const hasErrorField =
      body.message !== undefined ||
      body.error !== undefined ||
      body.errors !== undefined ||
      body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
  });
});
