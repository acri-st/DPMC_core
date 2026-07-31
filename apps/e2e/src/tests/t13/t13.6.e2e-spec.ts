import request from 'supertest';
import { API } from '../../support/auth';
import { deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from '../t03/_shared';
import { asAdminSession } from '../../support/session';

// @plan T13.6 — Detection and handling of invalid container image definitions
// @covers EOCP-E13-02
//
// Description: This test verifies that invalid or incomplete container image definitions are
//   detected and rejected before execution.
// Prerequisites: Validation rules for container definitions are enforced.
// Steps:
//   1. Register a container definition with missing fields → Validation is triggered
//   2. Attempt job execution → Execution is blocked
//   3. Inspect error message → Definition error is clearly reported

const NON_EXISTENT_ID = 0;
const hostname = uniqueHostname('t13-6-invalid-rt');

describe('T13.6 — Detection and handling of invalid container image definitions', () => {
  let cookie: string;
  let projectId: string;
  let dataCenterCode: string;

  beforeAll(async () => {
    ({ cookie } = await asAdminSession());

    const projectRes = await request(API).get('/project').set('Cookie', cookie).expect(200);
    projectId = (projectRes.body.data as { id: string }[])[0].id;

    dataCenterCode = await resolveDataCenterCode();
  });

  afterAll(async () => {
    await deleteHost(hostname);
  });

  // @plan T13.6
  // @covers EOCP-E13-02
  it('Step 1 – host registration with an invalid containerRuntime value is rejected', async () => {
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({ ...registerPayload(hostname, dataCenterCode), containerRuntime: 'InvalidRuntime' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  // @plan T13.6
  // @covers EOCP-E13-02
  it('Step 2 – task referencing a non-existent processorVersionId is rejected', async () => {
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId: NON_EXISTENT_ID,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T13.6 – invalid container definition test',
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  // @plan T13.6
  // @covers EOCP-E13-02
  it('Step 3 – error response for invalid container definition is structured (no stack trace)', async () => {
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({ ...registerPayload(hostname, dataCenterCode), containerRuntime: 'BadRuntime' });
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
