import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';
import { FIXTURES } from '../../setup/fixtures';

// @plan T08.4 — Rollback to a previous processor version
// @covers EOCP-E8-01, EOCP-E8-03
//
// Description: This test verifies that the system allows reverting to an older processor version
//   without impacting historical executions.
// Prerequisites: At least two processor versions are available. Rollback is permitted by
//   configuration.
// Steps:
//   1. Execute jobs with the latest processor version → Jobs complete normally
//   2. Reconfigure production to use previous version → Configuration is accepted
//   3. Execute new jobs → Jobs use the previous version
//   4. Inspect past executions → Historical jobs remain unchanged

const log = makeLogger('T08.4');

const SCRIPT_VERSION_ID = FIXTURES.processingScriptVersion.id;

describe('T08.4 — Rollback to a previous processor version', () => {
  let cookie: string;
  let latestPvId: string;
  let previousPvId: string;
  let taskWithLatestId: string;
  let taskWithPreviousId: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    // Create two fresh aux configs so each processor-version has a unique (scriptVersion, auxConfig) pair
    log.action('POST /auxiliary-configuration (latest)');
    const auxLatest = await request(API)
      .post('/auxiliary-configuration')
      .send({ name: `T08.4-aux-latest-${Date.now()}`, baseline: '1.0' });
    log.http('POST', '/auxiliary-configuration (latest)', auxLatest.status, auxLatest.status === 201 ? { id: auxLatest.body.data.id } : auxLatest.body);
    expect(auxLatest.status).toBe(201);
    const auxConfigId: string = auxLatest.body.data.id;

    log.action('POST /auxiliary-configuration (previous)');
    const auxPrevious = await request(API)
      .post('/auxiliary-configuration')
      .send({ name: `T08.4-aux-previous-${Date.now()}`, baseline: '1.0' });
    log.http('POST', '/auxiliary-configuration (previous)', auxPrevious.status, auxPrevious.status === 201 ? { id: auxPrevious.body.data.id } : auxPrevious.body);
    expect(auxPrevious.status).toBe(201);
    const auxPreviousId: string = auxPrevious.body.data.id;

    log.action('POST /processor-version (latest)');
    const pvLatest = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: SCRIPT_VERSION_ID,
        auxiliaryConfigurationId: auxConfigId,
        baseline: `T08.4-latest-${Date.now()}`,
        comment: 'T08.4 latest version',
      });
    log.http('POST', '/processor-version (latest)', pvLatest.status, pvLatest.status === 201 ? { id: pvLatest.body.data.id } : pvLatest.body);
    expect(pvLatest.status).toBe(201);
    latestPvId = pvLatest.body.data.id;

    log.action('POST /processor-version (previous)');
    const pvPrevious = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: SCRIPT_VERSION_ID,
        auxiliaryConfigurationId: auxPreviousId,
        baseline: `T08.4-previous-${Date.now()}`,
        comment: 'T08.4 previous version (rollback target)',
      });
    log.http('POST', '/processor-version (previous)', pvPrevious.status, pvPrevious.status === 201 ? { id: pvPrevious.body.data.id } : pvPrevious.body);
    expect(pvPrevious.status).toBe(201);
    previousPvId = pvPrevious.body.data.id;
    log.ok(`latestPvId=${latestPvId}, previousPvId=${previousPvId}`);
  });

  afterAll(async () => {
    if (taskWithLatestId) {
      await request(API).delete(`/task/${taskWithLatestId}`).set('Cookie', cookie);
    }
    if (taskWithPreviousId) {
      await request(API).delete(`/task/${taskWithPreviousId}`).set('Cookie', cookie);
    }
    if (latestPvId) {
      await request(API).delete(`/processor-version/${latestPvId}`);
    }
    if (previousPvId) {
      await request(API).delete(`/processor-version/${previousPvId}`);
    }
  });

  // @plan T08.4
  // @covers EOCP-E8-01, EOCP-E8-03
  it('Step 1 – task submitted with the latest processor version is accepted', async () => {
    log.step('Step 1 — POST /task (latest processor version)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: latestPvId,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T08.4 – task using latest processor version',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, processorVersionId: res.body.data.processorVersionId } : res.body);
    expect(res.status).toBe(201);
    taskWithLatestId = res.body.data.id;
    expect(res.body.data.processorVersionId).toBe(latestPvId);
    log.ok(`task with latest version: ${taskWithLatestId}`);
  });

  // @plan T08.4
  // @covers EOCP-E8-01, EOCP-E8-03
  it('Step 2 – processor version registry lists both versions (rollback target exists)', async () => {
    log.step('Step 2 — GET /processor-version (list)');
    const res = await request(API).get('/processor-version');
    log.http('GET', '/processor-version', res.status);
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((pv) => pv.id);
    expect(ids).toContain(latestPvId);
    expect(ids).toContain(previousPvId);
    log.ok(`both versions present: latestPvId=${latestPvId}, previousPvId=${previousPvId}`);
  });

  // @plan T08.4
  // @covers EOCP-E8-01, EOCP-E8-03
  it('Step 3 – task submitted with the previous (rollback) processor version is accepted', async () => {
    log.step('Step 3 — POST /task (previous/rollback processor version)');
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: previousPvId,
        priority: 5,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T08.4 – task after rollback to previous version',
      });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, processorVersionId: res.body.data.processorVersionId } : res.body);
    expect(res.status).toBe(201);
    taskWithPreviousId = res.body.data.id;
    expect(res.body.data.processorVersionId).toBe(previousPvId);
    log.ok(`task with previous version: ${taskWithPreviousId}`);
  });

  // @plan T08.4
  // @covers EOCP-E8-01, EOCP-E8-03
  it('Step 4 – historical task still references the latest version (past executions unchanged)', async () => {
    log.step(`Step 4 — GET /task/${taskWithLatestId}`);
    const res = await request(API)
      .get(`/task/${taskWithLatestId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskWithLatestId}`, res.status, res.status === 200 ? { processorVersionId: res.body.data.processorVersionId } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.processorVersionId).toBe(latestPvId);
    log.ok('historical task still references latest version (unchanged)');
  });
});
