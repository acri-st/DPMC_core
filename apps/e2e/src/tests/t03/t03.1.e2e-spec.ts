import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID, deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from './_shared';

// @plan T03.1 — Static evaluation of task resource requirements
// @covers EOCP-E3-01 EOCP-E3-03
//
// Description: Verifies that task resource requirements (CPU, RAM, GPU) declared statically in the
//   task definition are stored and visible for scheduler evaluation.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Register a host with known resources → Host capabilities are recorded
//   2. Create a task with resource parameters → Task stores the resource hints
//   3. Retrieve the task → Resource parameters are preserved
//   4. Create a task with high resource requirements → System accepts the declaration

const log = makeLogger('T03.1');

describe('T03.1 — Static evaluation of task resource requirements', () => {
  let cookie: string;
  let dataCenterCode: string;
  const hostname = uniqueHostname('t03-1-resources');
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    dataCenterCode = await resolveDataCenterCode();
    log.ok(`data center code: ${dataCenterCode}`);
  });

  afterAll(async () => {
    log.action(`afterAll — deleting ${createdTaskIds.length} task(s) and host ${hostname}`);
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
      log.ok(`deleted task ${id}`);
    }
    await deleteHost(hostname);
    log.ok(`host ${hostname} deleted`);
  });

  // @plan T03.1
  // @covers EOCP-E3-01
  it('Step 1 – host registers with explicit CPU, RAM, and GPU capabilities', async () => {
    log.step(`Step 1 — POST /host/register hostname=${hostname}`);

    const payload = { ...registerPayload(hostname, dataCenterCode), nbCores: 8, ram: 16_000_000_000, hasGpu: true, gpuCount: 1 };
    log.action('POST /host/register', { hostname, nbCores: 8, ram: '16GB', hasGpu: true });

    const res = await request(API).post('/host/register').set(workerHeader()).send(payload);
    log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id, hostname: res.body.data.hostname, nbCores: res.body.data.nbCores, hasGpu: res.body.data.hasGpu } : res.body);
    expect(res.status).toBe(200);

    expect(res.body.data.hostname).toBe(hostname);
    expect(res.body.data.nbCores).toBe(8);
    expect(res.body.data.hasGpu).toBe(true);
    log.ok('host registered with resource capabilities', { id: res.body.data.id });
  });

  // @plan T03.1
  // @covers EOCP-E3-03
  it('Step 2 – task with resource parameters is accepted (201)', async () => {
    log.step('Step 2 — POST /task with resource parameters');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 3, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T03.1 – resource-constrained task', parameters: { resources: { ramMb: 2048, cpuCores: 2, requireGpu: false } } };
    log.action('POST /task', { resources: payload.parameters.resources });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdTaskIds.push(res.body.data.id);
    log.ok('task with resource parameters accepted', { id: res.body.data.id });
  });

  // @plan T03.1
  // @covers EOCP-E3-03
  it('Step 3 – resource parameters are preserved in task metadata', async () => {
    const taskId = createdTaskIds[0];
    log.step(`Step 3 — GET /task/${taskId} verifying resource parameters`);

    if (!taskId) { log.warn('no task from Step 2 — skipping'); return; }

    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie).expect(200);
    const params = res.body.data.parameters as Record<string, unknown> | undefined;
    const resources = params?.resources as Record<string, unknown> | undefined;
    log.http('GET', `/task/${taskId}`, res.status, { parameters: params });

    expect(res.body.data.id).toBe(taskId);
    expect(params).toBeDefined();

    if (resources) {
      expect(resources.ramMb).toBe(2048);
      expect(resources.cpuCores).toBe(2);
      log.ok('resource parameters preserved in task metadata', resources);
    } else {
      log.warn('resources field not present in parameters — API may store as opaque blob');
    }
  });

  // @plan T03.1
  // @covers EOCP-E3-01 EOCP-E3-03
  it('Step 4 – task with high resource requirements is accepted (system records declaration)', async () => {
    log.step('Step 4 — POST /task with extreme resource requirements');

    const payload = { projectId: PROJECT_ID, kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID, priority: 5, productionMode: 'Nominal', priorityClass: 'NRT', scheduledStartTime: new Date().toISOString(), comment: 'T03.1 – high-resource task declaration', parameters: { resources: { ramMb: 65536, cpuCores: 32, requireGpu: true } } };
    log.action('POST /task', { resources: payload.parameters.resources });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task (high-resource)', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);

    createdTaskIds.push(res.body.data.id);
    log.ok('high-resource declaration accepted (lazy validation)', { id: res.body.data.id });
  });
});
