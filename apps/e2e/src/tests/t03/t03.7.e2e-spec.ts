import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from './_shared';

// @plan T03.7 — Real-time update of node processing characteristics
// @covers EOCP-E3-07
//
// Description: Verifies that a heartbeat call updates the host's lastHeartbeatAt and echoes back
//   the metric snapshot it received.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T03.7');

describe('T03.7 — Real-time update of node processing characteristics', () => {
  const hostname = uniqueHostname('e2e-host-heartbeat');
  let hostId: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env + registering host');
    await requireEnvReady();
    log.ok('env is reachable');

    const dataCenterCode = await resolveDataCenterCode();
    log.action(`POST /host/register hostname=${hostname}`);
    const res = await request(API).post('/host/register').set(workerHeader()).send(registerPayload(hostname, dataCenterCode)).expect(200);
    hostId = res.body.data.id;
    log.ok(`host registered: ${hostId}`);
  });

  afterAll(async () => {
    log.action(`afterAll — deleting host ${hostname}`);
    await deleteHost(hostname);
    log.ok('host deleted');
  });

  // @plan T03.7
  // @covers EOCP-E3-07
  it('heartbeat updates lastHeartbeatAt', async () => {
    log.step(`Step 1 — POST /host/${hostId}/heartbeat`);

    const metrics = { cpuLoad: 0.5, memUsage: 0.4, diskUsage: 0.2, runningJobs: 0 };
    log.action('POST /host/:id/heartbeat', metrics);

    const res = await request(API).post(`/host/${hostId}/heartbeat`).set(workerHeader()).send(metrics);
    log.http('POST', `/host/${hostId}/heartbeat`, res.status, res.status === 200 ? { lastHeartbeatAt: res.body.data.lastHeartbeatAt } : res.body);
    expect(res.status).toBe(200);

    expect(res.body.data.lastHeartbeatAt).toBeDefined();
    log.ok('lastHeartbeatAt updated', { lastHeartbeatAt: res.body.data.lastHeartbeatAt });
  });
});
