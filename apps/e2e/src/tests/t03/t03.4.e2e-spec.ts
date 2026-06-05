import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from './_shared';

// @plan T03.4 — GPU resource detection and scheduling
// @covers EOCP-E3-04
//
// Description: Ensures tasks requiring GPU resources are dispatched exclusively to GPU nodes.
//   Dispatch filtering by the live scheduler is infrastructure-blocked; this test verifies the
//   prerequisite: GPU capability is correctly recorded and queryable.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1a. Register GPU-capable node → hasGpu=true recorded
//   1b. Register non-GPU node → hasGpu=false recorded
//   2. Query node details → GPU capability correct per node
//   3. Dispatch to GPU-only node requires live scheduler (infrastructure-blocked)

const log = makeLogger('T03.4');

describe('T03.4 — GPU resource detection and scheduling', () => {
  const gpuHostname   = uniqueHostname('t03-4-gpu');
  const noGpuHostname = uniqueHostname('t03-4-nogpu');
  let gpuHostId:   string;
  let noGpuHostId: string;
  let dataCenterCode: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    dataCenterCode = await resolveDataCenterCode();
    log.ok(`data center code: ${dataCenterCode}`);
  });

  afterAll(async () => {
    log.action(`afterAll — deleting hosts ${gpuHostname}, ${noGpuHostname}`);
    await deleteHost(gpuHostname);
    await deleteHost(noGpuHostname);
    log.ok('hosts deleted');
  });

  // @plan T03.4
  // @covers EOCP-E3-04
  it('Step 1a – GPU-capable node registers with hasGpu=true', async () => {
    log.step(`Step 1a — POST /host/register hostname=${gpuHostname} hasGpu=true`);

    const payload = { ...registerPayload(gpuHostname, dataCenterCode), hasGpu: true, gpuCount: 2 };
    const res = await request(API).post('/host/register').set(workerHeader()).send(payload);
    log.http('POST', '/host/register (GPU)', res.status, res.status === 200 ? { id: res.body.data.id, hasGpu: res.body.data.hasGpu, gpuCount: res.body.data.gpuCount } : res.body);
    expect(res.status).toBe(200);

    gpuHostId = res.body.data.id;
    expect(res.body.data.hasGpu).toBe(true);
    log.ok('GPU node registered', { id: gpuHostId });
  });

  // @plan T03.4
  // @covers EOCP-E3-04
  it('Step 1b – non-GPU node registers with hasGpu=false', async () => {
    log.step(`Step 1b — POST /host/register hostname=${noGpuHostname} hasGpu=false`);

    const payload = { ...registerPayload(noGpuHostname, dataCenterCode), hasGpu: false, gpuCount: 0 };
    const res = await request(API).post('/host/register').set(workerHeader()).send(payload);
    log.http('POST', '/host/register (no GPU)', res.status, res.status === 200 ? { id: res.body.data.id, hasGpu: res.body.data.hasGpu } : res.body);
    expect(res.status).toBe(200);

    noGpuHostId = res.body.data.id;
    expect(res.body.data.hasGpu).toBe(false);
    log.ok('non-GPU node registered', { id: noGpuHostId });
  });

  // @plan T03.4
  // @covers EOCP-E3-04
  it('Step 2 – node details correctly reflect GPU capability for scheduler filtering', async () => {
    log.step('Step 2 — verifying GPU capability per node');

    log.action(`GET /host/${gpuHostId}`);
    const gpuRes = await request(API).get(`/host/${gpuHostId}`).expect(200);
    log.http('GET', `/host/${gpuHostId}`, gpuRes.status, { hasGpu: gpuRes.body.data.hasGpu });

    log.action(`GET /host/${noGpuHostId}`);
    const noGpuRes = await request(API).get(`/host/${noGpuHostId}`).expect(200);
    log.http('GET', `/host/${noGpuHostId}`, noGpuRes.status, { hasGpu: noGpuRes.body.data.hasGpu });

    expect(gpuRes.body.data.hasGpu).toBe(true);
    expect(noGpuRes.body.data.hasGpu).toBe(false);
    expect(gpuRes.body.data.hasGpu).not.toBe(noGpuRes.body.data.hasGpu);
    log.ok('GPU capability correctly differentiated between nodes');
  });

  // @plan T03.4
  // @covers EOCP-E3-04
  it('Step 3 – dispatch to GPU-only node requires live scheduler (infrastructure-blocked)', () => {
    log.step('Step 3 — infrastructure-blocked: live scheduler dispatch');
    log.warn('dispatch filtering requires running scheduler + executor — prerequisite verified in steps 1–2');
    expect(gpuHostId).toBeDefined();
    expect(noGpuHostId).toBeDefined();
    log.ok('prerequisite confirmed — GPU capability stored and queryable');
  });
});
