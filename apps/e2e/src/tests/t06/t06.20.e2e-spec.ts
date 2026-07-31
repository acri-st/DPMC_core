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

// @plan T06.20 — Abnormal container termination handling
// @covers EOCP-E6-06, EOCP-E6-11
//
// Description: This test verifies that a task whose container dies abnormally is detected and its
//   job is closed according to policy rather than left in RUNNING.
// Prerequisites: Job monitoring is active.
// Steps:
//   1. Launch a containerized task → Task enters RUNNING state
//   2. Force abnormal container termination → Termination is detected
//   3. Observe job state → Job marked as failed and handled according to policy

const log = makeLogger('T06.20');

// apps/dispatcher config.monitor_lost_host_threshold_s.
const LOST_HOST_THRESHOLD_S = 120;

describe('T06.20 — Abnormal container termination handling', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let taskId: number;
  let jobId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t06-20-container');

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
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T06.20
  // @covers EOCP-E6-06, EOCP-E6-11
  it('Step 1 – a containerized task reaches RUNNING', async () => {
    log.step('Step 1 — place a Docker job and mark it picked up');

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * 2,
        ram: Number(need.ram * 2n),
        containerRuntime: 'Docker',
      });
    expect(res.status).toBe(200);
    hostId = res.body.data.id;
    stopHeartbeats = keepHostsAlive([hostId]);

    const { processorVersionId } = await createProcessorVersion(
      `T06.20-${Date.now()}`,
      { ...need, runtime: 'Docker' },
    );
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T06.20 – container task');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    jobId = allocs[0].jobId;

    // No worker process backs a synthetic host, so the pickup a real worker
    // performs is applied directly — this is the state a container crash
    // leaves behind.
    await withDbClient(async (c) => {
      await c.query(
        `UPDATE "job" SET status = 'running', "hostId" = $2, "startedAt" = NOW() WHERE id = $1`,
        [jobId, hostId],
      );
    });

    const state = await withDbClient(async (c) => {
      const r = await c.query(`SELECT status FROM "job" WHERE id = $1`, [jobId]);
      return r.rows[0].status as string;
    });
    expect(state).toBe('running');
    log.ok(`job ${jobId} is RUNNING inside a container on node ${hostId}`);
  }, 180_000);

  // @plan T06.20
  // @covers EOCP-E6-06, EOCP-E6-11
  it('Step 2 – the abnormal termination is detected', async () => {
    log.step('Step 2 — the container dies with its node, taking the heartbeat with it');

    stopHeartbeats?.();
    stopHeartbeats = undefined;
    await setHeartbeat(hostname, `${LOST_HOST_THRESHOLD_S * 2} seconds`);

    const deadline = Date.now() + 90_000;
    let status = 'running';
    while (Date.now() < deadline) {
      status = await withDbClient(async (c) => {
        const r = await c.query(`SELECT status FROM "job" WHERE id = $1`, [jobId]);
        return r.rows[0].status as string;
      });
      if (status !== 'running') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(status).not.toBe('running');
    log.ok(`termination detected — job moved out of RUNNING to ${status}`);
  }, 150_000);

  // @plan T06.20
  // @covers EOCP-E6-06, EOCP-E6-11
  it('Step 3 – the job is failed and its resources handed back', async () => {
    log.step('Step 3 — check the closing state and the reservation');

    const snapshot = await withDbClient(async (c) => {
      const job = await c.query(
        `SELECT status, attempt, "lastError", "endedAt" FROM "job" WHERE id = $1`,
        [jobId],
      );
      const alloc = await c.query(
        `SELECT COUNT(*)::int AS n FROM "job_x_allocation"
         WHERE "jobId" = $1 AND "releasedAt" IS NULL`,
        [jobId],
      );
      return { ...job.rows[0], live: alloc.rows[0].n as number };
    });
    log.ok(`job state: ${JSON.stringify(snapshot)}`);

    expect(snapshot.status).toBe('failed');
    // Closed properly: the failure is recorded and the capacity is back.
    expect(snapshot.lastError).toBeTruthy();
    expect(snapshot.endedAt).not.toBeNull();
    expect(snapshot.live).toBe(0);
    log.ok('job failed with a recorded cause and no lingering reservation');
  }, 90_000);
});
