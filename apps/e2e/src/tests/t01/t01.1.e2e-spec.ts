import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { dispatcher } from '../../setup/services/dispatcher';
import { workerProcess } from '../../setup/services/worker-process';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from './_env-check';

// @plan T01.1 — Independent deployment and restart of core DPMC components
// @covers EOCP-E1-01
//
// Description: Verifies that the main DPMC components (Scheduler/dispatcher,
//   API layer, Execution Engine/worker) are architecturally decoupled and can
//   be stopped or restarted independently without compromising overall system
//   stability.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
//   This test controls the dispatcher and worker lifecycle directly.
// Steps:
//   1. API layer is reachable independently (no dispatcher, no worker)
//   2. Stop the dispatcher → /scheduler/status reports unavailability clearly
//   3. Restart the dispatcher → /scheduler/status reports healthy again
//   4. Worker (Execution Engine) registers and goes offline when stopped

const log = makeLogger('T01.1');

describe('T01.1 — Independent deployment and restart of core DPMC components', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('stopping any running dispatcher and workers');
    workerProcess.stopAll();
    dispatcher.stop();
    log.ok('dispatcher + workers stopped');
  });

  afterAll(() => {
    log.action('afterAll — cleanup: stopping dispatcher + workers');
    dispatcher.stop();
    workerProcess.stopAll();
  });

  // @plan T01.1 — Step 1
  // @covers EOCP-E1-01
  it('Step 1 – API layer is reachable independently (no dispatcher, no worker running)', async () => {
    log.step('Step 1 — GET /status (no dispatcher, no worker)');

    const res = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', res.status, res.body.data);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('OK');
    log.ok('API is reachable independently', { status: res.body.data.status });
  });

  // @plan T01.1 — Step 2
  // @covers EOCP-E1-01
  it('Step 2 – /scheduler/status reports unavailability when dispatcher is stopped', async () => {
    log.step('Step 2 — waiting for dispatcher healthy threshold to expire (≤40s)');

    await dispatcher.waitUnhealthy(API, 40_000);
    log.ok('dispatcher is now unhealthy');

    const res = await request(API).get('/scheduler/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/scheduler/status', res.status, res.body.data);

    const data = res.body.data as { healthy?: boolean } | null;
    // Either no record yet (null) or healthy=false — both are valid "unavailable" states
    expect(!data || data.healthy === false).toBe(true);
    log.ok('scheduler status reports unavailability', { data });
  }, 45_000);

  // @plan T01.1 — Step 3
  // @covers EOCP-E1-01
  it('Step 3 – Restart dispatcher → /scheduler/status reports healthy', async () => {
    log.step('Step 3 — starting dispatcher');
    dispatcher.start();
    log.action('waiting for dispatcher to become healthy (≤20s)');

    await dispatcher.waitHealthy(API, 20_000);
    log.ok('dispatcher is healthy');

    const res = await request(API).get('/scheduler/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/scheduler/status', res.status, res.body.data);

    expect(res.body.data?.healthy).toBe(true);
    log.ok('scheduler status reports healthy', { healthy: res.body.data?.healthy });
  }, 25_000);

  // @plan T01.1 — Step 3b
  // @covers EOCP-E1-01
  it('Step 3b – Stop dispatcher → /scheduler/status becomes unhealthy (no side effects on API)', async () => {
    log.step('Step 3b — stopping dispatcher');
    dispatcher.stop();
    log.action('waiting for healthy threshold to expire (≤40s)');

    await dispatcher.waitUnhealthy(API, 40_000);
    log.ok('dispatcher is now unhealthy again');

    const res = await request(API).get('/scheduler/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/scheduler/status', res.status, res.body.data);
    expect(res.body.data?.healthy).toBe(false);
    log.ok('scheduler reports unhealthy', { healthy: res.body.data?.healthy });

    log.action('GET /status — verifying API has no side effects');
    const statusRes = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', statusRes.status, statusRes.body.data);
    log.ok('API still operational after dispatcher stop');
  }, 45_000);

  // @plan T01.1 — Step 4
  // @covers EOCP-E1-01
  it('Step 4 – Worker registers (Execution Engine up), then goes offline when stopped', async () => {
    const { hostname } = require('node:os');
    const workerHostname = hostname() as string;

    log.step(`Step 4 — starting worker (hostname: ${workerHostname})`);
    workerProcess.start('t01');
    log.action('waiting for worker to register (≤20s)');

    const hostId = await workerProcess.waitRegistered(API, workerHostname, cookie, 20_000);
    log.ok('worker registered', { hostId, hostname: workerHostname });
    expect(hostId).toBeDefined();

    log.action(`GET /host/${hostId}`);
    const upRes = await request(API).get(`/host/${hostId}`).set('Cookie', cookie).expect(200);
    log.http('GET', `/host/${hostId}`, upRes.status, { status: upRes.body.data.status });
    expect(upRes.body.data.status).toBe('Up');
    log.ok('host status is Up');

    log.action('stopping worker — waiting for API to mark host offline (≤90s)');
    workerProcess.stop('t01');
    await workerProcess.waitOffline(API, hostId, cookie, 90_000);
    log.ok('worker marked offline by API');

    const offRes = await request(API).get(`/host/${hostId}`).set('Cookie', cookie).expect(200);
    log.http('GET', `/host/${hostId}`, offRes.status, { status: offRes.body.data.status });
    expect(offRes.body.data.status).toBe('Off');
    log.ok('host status is Off');

    log.action('GET /status — final API health check');
    const finalRes = await request(API).get('/status').set('Cookie', cookie).expect(200);
    log.http('GET', '/status', finalRes.status, finalRes.body.data);
    log.ok('API still operational after full worker lifecycle');
  }, 120_000);
});
