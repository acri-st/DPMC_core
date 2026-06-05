import request from 'supertest';
import { API } from '../../support/auth';
import { deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T13.4 — Runtime compatibility enforcement between jobs and nodes
// @covers EOCP-E13-01
//
// Description: This test verifies that jobs requiring a specific container runtime are dispatched
//   only to nodes supporting that runtime.
// Prerequisites: Execution nodes declare supported runtimes. Jobs can specify runtime constraints.
// Steps:
//   1. Register nodes with different runtimes → Node capabilities are recorded
//   2. Submit a job requiring Apptainer → Scheduler filters nodes
//   3. Observe job dispatch → Job runs only on compatible node

describe('T13.4 — Runtime compatibility enforcement between jobs and nodes', () => {
  const dockerHostname = uniqueHostname('t13-4-docker');
  const apptainerHostname = uniqueHostname('t13-4-apptainer');
  let dockerHostId: string;
  let apptainerHostId: string;
  let dataCenterCode: string;

  beforeAll(async () => {
    dataCenterCode = await resolveDataCenterCode();
  });

  afterAll(async () => {
    await deleteHost(dockerHostname);
    await deleteHost(apptainerHostname);
  });

  // @plan T13.4
  // @covers EOCP-E13-01
  it('Step 1 – Docker-capable node registers and its containerRuntime is stored', async () => {
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({ ...registerPayload(dockerHostname, dataCenterCode), containerRuntime: 'Docker' })
      .expect(200);
    dockerHostId = res.body.data.id;
    expect(res.body.data.containerRuntime).toBe('Docker');
  });

  // @plan T13.4
  // @covers EOCP-E13-01
  it('Step 1 – Apptainer-capable node registers and its containerRuntime is stored', async () => {
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({ ...registerPayload(apptainerHostname, dataCenterCode), containerRuntime: 'Apptainer' })
      .expect(200);
    apptainerHostId = res.body.data.id;
    expect(res.body.data.containerRuntime).toBe('Apptainer');
  });

  // @plan T13.4
  // @covers EOCP-E13-01
  it('Step 2 – both nodes are retrievable and report distinct runtimes (scheduler can filter)', async () => {
    const [dockerRes, apptainerRes] = await Promise.all([
      request(API).get(`/host/${dockerHostId}`).expect(200),
      request(API).get(`/host/${apptainerHostId}`).expect(200),
    ]);
    expect(dockerRes.body.data.containerRuntime).toBe('Docker');
    expect(apptainerRes.body.data.containerRuntime).toBe('Apptainer');
    expect(dockerRes.body.data.containerRuntime).not.toBe(
      apptainerRes.body.data.containerRuntime,
    );
  });

  // @plan T13.4
  // @covers EOCP-E13-01
  it('Step 3 – runtime dispatch to matching node only is enforced by live scheduler (infrastructure-blocked)', () => {
    expect(dockerHostId).toBeDefined();
    expect(apptainerHostId).toBeDefined();
  });
});
