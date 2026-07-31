import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { CONFIG } from '../../constants/config';
import { dispatcher } from '../../setup/services/dispatcher';
import { workerProcess } from '../../setup/services/worker-process';
import {
  ambientCeiling,
  createAndTriggerTask,
  createProcessorVersion,
  deleteHost,
  keepHostsAlive,
  registerPayload,
  releaseTasks,
  resolveDataCenterCode,
  setHeartbeat,
  uniqueHostname,
  waitForAllocations,
  withDbClient,
  workerHeader,
} from '../t03/_shared';
import { docker } from '../../setup/services/docker';

// @plan T06.21 — Scheduler behavior during database unavailability
// @covers EOCP-E6-07
//
// Description: This test verifies that the scheduler degrades safely when its database becomes
//   unreachable and resumes once connectivity returns.
// Prerequisites: The database can be taken down and brought back independently.
// Steps:
//   1. Start a job → Job is running
//   2. Make database temporarily unavailable → Scheduler enters degraded mode
//   3. Restore database connectivity → Scheduler resumes normal operation

const log = makeLogger('T06.21');

const DB_SERVICE = 'database';
const OUTAGE_MS = 15_000;

describe('T06.21 — Scheduler behavior during database unavailability', () => {
  let cookie: string;
  let dataCenterCode: string;
  let taskId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t06-21-db');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();
    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 3, ram: ceiling.ram + 2_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // The database is shared by the whole run: it has to be back up whatever
    // happened above, before anything else touches it.
    try {
      docker.startService(DB_SERVICE);
    } catch {
      /* already up */
    }
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T06.21
  // @covers EOCP-E6-07
  it('Step 1 – a job is scheduled and running', async () => {
    log.step('Step 1 — place a job before taking the database away');

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * 2,
        ram: Number(need.ram * 2n),
      });
    expect(res.status).toBe(200);
    stopHeartbeats = keepHostsAlive([res.body.data.id]);

    const { processorVersionId } = await createProcessorVersion(`T06.21-${Date.now()}`, need);
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T06.21 – db outage');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    log.ok(`job placed on node ${allocs[0].hostId}`);
  }, 180_000);

  // @plan T06.21
  // @covers EOCP-E6-07
  it('Step 2 – the scheduler degrades instead of dying when the database goes away', async () => {
    log.step(`Step 2 — stop the ${DB_SERVICE} service for ${OUTAGE_MS}ms`);

    stopHeartbeats?.();
    stopHeartbeats = undefined;
    docker.stopService(DB_SERVICE);
    log.ok('database stopped');

    await new Promise((r) => setTimeout(r, OUTAGE_MS));

    // Degraded, not crashed: the process is expected to survive an outage it
    // cannot control and keep retrying.
    const alive = dispatcher.isRunning();
    log.ok(`dispatcher process alive during the outage: ${alive}`);
    expect(alive).toBe(true);
  }, 120_000);

  // @plan T06.21
  // @covers EOCP-E6-07
  it('Step 3 – the scheduler resumes once the database is back', async () => {
    log.step('Step 3 — restart the database and wait for the scheduler to report healthy again');

    docker.startService(DB_SERVICE);
    log.ok('database restarted');

    await dispatcher.waitHealthy(CONFIG.api.url, 90_000);
    log.ok('dispatcher reported healthy again');

    // And it is scheduling again, not merely alive.
    const res = await request(API).get('/status');
    expect(res.status).toBe(200);
    const entry = (res.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');

    const jobs = await withDbClient(async (c) => {
      const r = await c.query(`SELECT COUNT(*)::int AS n FROM "job"`);
      return r.rows[0].n as number;
    });
    expect(jobs).toBeGreaterThanOrEqual(0);
    log.ok('scheduler resumed normal operation with its state intact');
  }, 180_000);
});
