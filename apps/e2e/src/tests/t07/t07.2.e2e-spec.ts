import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession, asOperatorSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T07.2 — Manual triggering of jobs
// @covers EOCP-E7-02
//
// Description: This test verifies that operators can manually trigger jobs using the user
//   interface. The REST API is the authoritative surface for manual triggering.
// Prerequisites: An operator account with appropriate permissions exists. At least one production
//   chain is configured.
// Steps:
//   1. Log into the DPMC UI → Access is granted (session established)
//   2. Manually launch a job → Job is created
//   3. Observe execution → Job is scheduled and accessible

const log = makeLogger('T07.2');

describe('T07.2 — Manual triggering of jobs', () => {
  let adminCookie: string;
  let operatorCookie: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie: adminCookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('forging operator session');
    ({ cookie: operatorCookie } = await asOperatorSession());
    log.ok('operator session ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', adminCookie);
    }
  });

  // @plan T07.2
  // @covers EOCP-E7-02
  it('Step 1 – operator can authenticate and access the task list (UI access granted)', async () => {
    log.step('Step 1 — GET /task and GET /auth/me (operator session)');
    const taskList = await request(API).get('/task').set('Cookie', operatorCookie);
    log.http('GET', '/task', taskList.status);
    expect(taskList.status).toBe(200);

    const me = await request(API).get('/auth/me').set('Cookie', operatorCookie);
    log.http('GET', '/auth/me', me.status, me.status === 200 ? { id: me.body.data?.id } : me.body);
    expect(me.status).toBe(200);
    log.ok('operator session authenticated');
  });

  // @plan T07.2
  // @covers EOCP-E7-02
  it('Step 2 – operator manually launches a job via POST /task', async () => {
    log.step('Step 2 — POST /task (operator manual trigger)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', operatorCookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: PROCESSOR_VERSION_ID,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T07.2 – manual operator trigger',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok(`operator task created: ${res.body.data.id}`);
  });

  // @plan T07.2
  // @covers EOCP-E7-02
  it('Step 3 – manually triggered job is accessible and has a valid scheduled status', async () => {
    const taskId = createdTaskIds[0];
    log.step(`Step 3 — GET /task/${taskId}`);
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', operatorCookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { status: res.body.data.status, scheduledStartTime: res.body.data.scheduledStartTime } : res.body);
    expect(res.status).toBe(200);

    const validStatuses = ['Edited', 'Queued', 'Running', 'Done', 'Error', 'Suspended'];
    expect(validStatuses).toContain(res.body.data.status);
    expect(res.body.data.scheduledStartTime).toBeDefined();
    log.ok(`task status: ${res.body.data.status}`);
  });
});
