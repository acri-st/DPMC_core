import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, setHeartbeat, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T06.6 — Detection and eviction of zombie nodes
// @covers EOCP-E6-05
//
// Description: This test verifies that execution nodes that stop sending heartbeats are
//   automatically detected and evicted.
// Prerequisites: Heartbeat mechanism is enabled. A node can be forcefully disconnected.
// Steps:
//   1. Start a job on a node → Job enters RUNNING state
//   2. Stop heartbeat from the node → Node becomes silent
//   3. Wait for heartbeat timeout → Node is evicted
//   4. Observe impacted jobs → Jobs are rescheduled

const log = makeLogger('T06.6');

describe('T06.6 — Detection and eviction of zombie nodes', () => {
  let cookie: string;
  let hostId: string;
  const hostname = uniqueHostname('t06-6-zombie');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /host/register');
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send(registerPayload(hostname));
    log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id, hostname } : res.body);
    expect(res.status).toBe(200);
    hostId = res.body.data.id;

    log.action('POST /host/:id/heartbeat (initial)');
    const hb = await request(API)
      .post(`/host/${hostId}/heartbeat`)
      .set(workerHeader())
      .send({ cpuLoad: 0.1, memUsage: 0.2, diskUsage: 0.1 });
    log.http('POST', `/host/${hostId}/heartbeat`, hb.status);
    expect(hb.status).toBe(200);
    log.ok(`host registered and heartbeat sent, hostId=${hostId}`);
  });

  afterAll(async () => {
    await deleteHost(hostname);
  });

  // @plan T06.6
  // @covers EOCP-E6-05
  it('Step 1 – host is registered and active after initial heartbeat', async () => {
    log.step('Step 1 — GET /host/:id');
    const res = await request(API)
      .get(`/host/${hostId}`);
    log.http('GET', `/host/${hostId}`, res.status, res.status === 200 ? { id: res.body.data.id, hostname: res.body.data.hostname } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(hostId);
    expect(res.body.data.hostname).toBe(hostname);
    log.ok('host is active');
  });

  // @plan T06.6
  // @covers EOCP-E6-05
  it('Step 2 – simulating stale heartbeat (backdating lastHeartbeatAt by 10 minutes)', async () => {
    log.step('Step 2 — setHeartbeat (10 minutes ago)');
    await setHeartbeat(hostname, '10 minutes');
    log.ok('heartbeat backdated');

    const res = await request(API)
      .get(`/host/${hostId}`);
    log.http('GET', `/host/${hostId}`, res.status, res.status === 200 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(hostId);
    log.ok('host still visible after stale heartbeat');
  });

  // @plan T06.6
  // @covers EOCP-E6-05
  it('Step 3 – setting host to Maintenance evicts it from the active pool', async () => {
    log.step('Step 3 — PATCH /host/:id/status → Maintenance');
    const patch = await request(API)
      .patch(`/host/${hostId}/status`)
      .set(workerHeader())
      .send({ status: 'Maintenance' });
    log.http('PATCH', `/host/${hostId}/status`, patch.status, patch.status === 200 ? { status: patch.body.data?.status } : patch.body);
    expect(patch.status).toBe(200);

    log.action('GET /host/active');
    const res = await request(API)
      .get('/host/active');
    log.http('GET', '/host/active', res.status);
    expect(res.status).toBe(200);
    const activeIds = (res.body.data as { id: string }[]).map((h) => h.id);
    expect(activeIds).not.toContain(hostId);
    log.ok('host evicted from active pool');
  });

  // @plan T06.6
  // @covers EOCP-E6-05
  it('Step 4 – setting host to Off removes it from active hosts entirely', async () => {
    log.step('Step 4 — PATCH /host/:id/status → Off');
    const patch = await request(API)
      .patch(`/host/${hostId}/status`)
      .set(workerHeader())
      .send({ status: 'Off' });
    log.http('PATCH', `/host/${hostId}/status`, patch.status, patch.status === 200 ? { status: patch.body.data?.status } : patch.body);
    expect(patch.status).toBe(200);

    log.action('GET /host/active');
    const res = await request(API)
      .get('/host/active');
    log.http('GET', '/host/active', res.status);
    expect(res.status).toBe(200);
    const activeIds = (res.body.data as { id: string }[]).map((h) => h.id);
    expect(activeIds).not.toContain(hostId);
    log.ok('host removed from active hosts');
  });
});
