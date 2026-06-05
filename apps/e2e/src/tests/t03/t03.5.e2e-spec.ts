import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, resolveDataCenterCode, uniqueHostname, workerHeader } from './_shared';

// @plan T03.5 — Automatic node self-registration
// @covers EOCP-E3-05
//
// Description: Verifies that a host can register itself via the worker API with a valid shared
//   secret, and that an unknown data-center code is rejected.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T03.5');

describe('T03.5 — Automatic node self-registration', () => {
  const hostname = uniqueHostname('e2e-host-register');
  let dataCenterCode: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    dataCenterCode = await resolveDataCenterCode();
    log.ok(`data center code: ${dataCenterCode}`);
  });

  afterAll(async () => {
    log.action(`afterAll — deleting host ${hostname}`);
    await deleteHost(hostname);
    log.ok('host deleted');
  });

  // @plan T03.5
  // @covers EOCP-E3-05
  it('registers a host with a valid worker secret', async () => {
    log.step(`Step 1 — POST /host/register hostname=${hostname}`);
    log.action('POST /host/register', { hostname, dataCenterCode });

    const res = await request(API).post('/host/register').set(workerHeader()).send(registerPayload(hostname, dataCenterCode));
    log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id, hostname: res.body.data.hostname, status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);

    expect(res.body.data.hostname).toBe(hostname);
    expect(res.body.data.status).toBeDefined();
    log.ok('host registered successfully', { id: res.body.data.id, status: res.body.data.status });
  });

  // @plan T03.5
  // @covers EOCP-E3-05
  it('returns an error when the data-center code is unknown', async () => {
    log.step('Step 2 — POST /host/register with unknown dataCenterCode=NOPE');

    const res = await request(API).post('/host/register').set(workerHeader()).send({ ...registerPayload(`${hostname}-bogus`, dataCenterCode), dataCenterCode: 'NOPE' });
    log.http('POST', '/host/register (bad DC)', res.status, res.body);
    expect([400, 404, 422]).toContain(res.status);
    log.ok(`unknown data-center correctly rejected (${res.status})`);
  });
});
