import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';
import { FIXTURES } from '../../setup/fixtures';

// @plan T08.5 — Audit trail reconstruction for processor versions
// @covers EOCP-E8-02
//
// Description: This test verifies that it is possible to reconstruct which processor version was
//   used for any past execution.
// Prerequisites: Execution history and logs are retained.
// Steps:
//   1. Select a completed job → Job history is accessible
//   2. Inspect logs and metadata → Processor version is identifiable
//   3. Correlate with processor registry → Version details match registry

const log = makeLogger('T08.5');

const SCRIPT_VERSION_ID = FIXTURES.processingScriptVersion.id;

describe('T08.5 — Audit trail reconstruction for processor versions', () => {
  let cookie: string;
  let pvId: string;
  let taskId: string;
  let auxConfigId: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    // Create a fresh aux config so the (scriptVersion, auxConfig) pair is unique
    log.action('POST /auxiliary-configuration');
    const auxRes = await request(API)
      .post('/auxiliary-configuration')
      .send({ name: `T08.5-aux-${Date.now()}`, baseline: '1.0' });
    log.http('POST', '/auxiliary-configuration', auxRes.status, auxRes.status === 201 ? { id: auxRes.body.data.id } : auxRes.body);
    expect(auxRes.status).toBe(201);
    auxConfigId = auxRes.body.data.id;

    log.action('POST /processor-version');
    const pv = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: SCRIPT_VERSION_ID,
        auxiliaryConfigurationId: auxConfigId,
        baseline: `T08.5-audit-${Date.now()}`,
        comment: 'T08.5 audit trail test',
      });
    log.http('POST', '/processor-version', pv.status, pv.status === 201 ? { id: pv.body.data.id } : pv.body);
    expect(pv.status).toBe(201);
    pvId = pv.body.data.id;
    log.ok(`pvId=${pvId}, auxConfigId=${auxConfigId}`);
  });

  afterAll(async () => {
    if (taskId) {
      await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    }
    if (pvId) {
      await request(API).delete(`/processor-version/${pvId}`);
    }
  });

  // @plan T08.5
  // @covers EOCP-E8-02
  it('Step 1 – task submitted with a specific processorVersionId is accessible via GET', async () => {
    log.step('Step 1 — POST /task + GET /task/:id');
    const createRes = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId: PROJECT_ID,
        kind: 'Standalone',
        processorVersionId: pvId,
        priority: 3,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T08.5 – audit trail task',
      });
    log.http('POST', '/task', createRes.status, createRes.status === 201 ? { id: createRes.body.data.id, processorVersionId: createRes.body.data.processorVersionId } : createRes.body);
    expect(createRes.status).toBe(201);
    taskId = createRes.body.data.id;

    const getRes = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, getRes.status, getRes.status === 200 ? { id: getRes.body.data.id } : getRes.body);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(taskId);
    log.ok(`task created and accessible: ${taskId}`);
  });

  // @plan T08.5
  // @covers EOCP-E8-02
  it('Step 2 – task metadata carries processorVersionId (version identifiable from task record)', async () => {
    log.step(`Step 2 — GET /task/${taskId} (processorVersionId check)`);
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, res.status === 200 ? { processorVersionId: res.body.data.processorVersionId } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.processorVersionId).toBe(pvId);
    log.ok('processorVersionId confirmed on task record');
  });

  // @plan T08.5
  // @covers EOCP-E8-02
  it('Step 3 – processor version details are retrievable from registry (audit correlation)', async () => {
    log.step(`Step 3 — GET /processor-version/${pvId}`);
    const res = await request(API)
      .get(`/processor-version/${pvId}`);
    log.http('GET', `/processor-version/${pvId}`, res.status, res.status === 200 ? { id: res.body.data.id, processingScriptVersionId: res.body.data.processingScriptVersionId, auxiliaryConfigurationId: res.body.data.auxiliaryConfigurationId } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(pvId);
    expect(res.body.data.processingScriptVersionId).toBe(SCRIPT_VERSION_ID);
    expect(res.body.data.auxiliaryConfigurationId).toBe(auxConfigId);
    log.ok('processor version details verified for audit correlation');
  });
});
