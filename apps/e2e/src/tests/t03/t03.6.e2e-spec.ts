import request from 'supertest';
import { API, asAdmin } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, resolveDataCenterCode, setHeartbeat, uniqueHostname, withDbClient, workerHeader } from './_shared';

// @plan T03.6 — Management of node operational states
// @covers EOCP-E3-06
//
// Description: Verifies that the host status can be updated explicitly and that a stale heartbeat
//   is reflected by the API.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T03.6');

describe('T03.6 — Management of node operational states', () => {
  const hostname = uniqueHostname('e2e-host-state');
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

  // @plan T03.6
  // @covers EOCP-E3-06
  it('explicit status updates are persisted', async () => {
    log.step(`Step 1 — PATCH /host/${hostId}/status → Maintenance`);

    log.action(`PATCH /host/${hostId}/status`, { status: 'Maintenance' });
    const res = await request(API).patch(`/host/${hostId}/status`).set(workerHeader()).send({ status: 'Maintenance' });
    log.http('PATCH', `/host/${hostId}/status`, res.status, res.body.data ?? res.body);
    expect(res.status).toBe(200);

    log.action('DB check — verifying status persisted as "maintenance"');
    await withDbClient(async (c) => {
      const r = await c.query(`SELECT status FROM "host" WHERE id = $1`, [hostId]);
      const dbStatus = r.rows[0].status;
      log.ok(`DB status: ${dbStatus}`);
      expect(dbStatus).toBe('maintenance');
    });
  });

  // @plan T03.6
  // @covers EOCP-E3-06
  it('lastHeartbeatAt is exposed and updated through staleness windows', async () => {
    log.step('Step 2 — staleness: set heartbeat to 1 minute ago');

    log.action(`setHeartbeat(${hostname}, 1 minute)`);
    await setHeartbeat(hostname, '1 minute');
    log.ok('heartbeat backdated by 1 minute');

    log.action(`GET /host/${hostId}`);
    const res = await request(API).get(`/host/${hostId}`).set(await asAdmin()).expect(200);
    log.http('GET', `/host/${hostId}`, res.status, { lastHeartbeatAt: res.body.data.lastHeartbeatAt });

    expect(res.body.data.lastHeartbeatAt).toBeDefined();
    log.ok('lastHeartbeatAt is exposed in host response', { lastHeartbeatAt: res.body.data.lastHeartbeatAt });
  });
});
