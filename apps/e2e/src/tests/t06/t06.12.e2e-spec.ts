import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
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

// @plan T06.12 — Automatic recovery of orphan jobs
// @covers EOCP-E6-11
//
// Description: This test verifies that jobs left running on a node that disappears are detected and
//   recovered rather than left hanging.
// Prerequisites: Job monitoring is active.
// Steps:
//   1. Job is running → Job is running
//   2. Job becomes orphan → Job becomes orphan
//   3. Job is recovered → Job is recovered

const log = makeLogger('T06.12');

// apps/dispatcher config.monitor_lost_host_threshold_s. Backdating the
// heartbeat past it is what makes the host "lost" without a two-minute wait.
const LOST_HOST_THRESHOLD_S = 120;

describe('T06.12 — Automatic recovery of orphan jobs', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let taskId: number;
  let jobId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t06-12-orphan');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 3, ram: ceiling.ram + 3_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T06.12
  // @covers EOCP-E6-11
  it('Step 1 – a job is running on a node', async () => {
    log.step('Step 1 — place a job, then mark it as picked up by the node');

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * 2,
        ram: Number(need.ram * 2n),
      });
    expect(res.status).toBe(200);
    hostId = res.body.data.id;
    stopHeartbeats = keepHostsAlive([hostId]);

    const { processorVersionId } = await createProcessorVersion(
      `T06.12-${Date.now()}`,
      need,
    );
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T06.12 – orphan job');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    jobId = allocs[0].jobId;

    // No worker process backs a synthetic host, so the pickup the real worker
    // would perform is applied directly: this is the state the recovery path
    // has to deal with.
    await withDbClient(async (c) => {
      await c.query(
        `UPDATE "job" SET status = 'running', "hostId" = $2, "startedAt" = NOW()
         WHERE id = $1`,
        [jobId, hostId],
      );
    });
    log.ok(`job ${jobId} is Running on node ${hostId}`);
  }, 180_000);

  // @plan T06.12
  // @covers EOCP-E6-11
  it('Step 2 – the node disappears, leaving the job orphaned', async () => {
    log.step('Step 2 — stop the heartbeats and age the node past the lost threshold');

    stopHeartbeats?.();
    stopHeartbeats = undefined;
    await setHeartbeat(hostname, `${LOST_HOST_THRESHOLD_S * 2} seconds`);

    const state = await withDbClient(async (c) => {
      const res = await c.query(`SELECT status FROM "job" WHERE id = $1`, [jobId]);
      return res.rows[0]?.status as string;
    });
    log.ok(`job ${jobId} is still ${state} while its node is gone — orphaned`);
    expect(state).toBe('running');
  }, 60_000);

  // @plan T06.12
  // @covers EOCP-E6-11
  it('Step 3 – the orphan is detected and its resources are released', async () => {
    log.step('Step 3 — wait for the monitor to reclaim the job');

    const deadline = Date.now() + 90_000;
    let status = '';
    let liveAllocations = 1;
    while (Date.now() < deadline) {
      const snapshot = await withDbClient(async (c) => {
        const job = await c.query(`SELECT status, attempt FROM "job" WHERE id = $1`, [jobId]);
        const alloc = await c.query(
          `SELECT COUNT(*)::int AS n FROM "job_x_allocation"
           WHERE "jobId" = $1 AND "releasedAt" IS NULL`,
          [jobId],
        );
        return {
          status: job.rows[0]?.status as string,
          attempt: job.rows[0]?.attempt as number,
          live: alloc.rows[0].n as number,
        };
      });
      status = snapshot.status;
      liveAllocations = snapshot.live;
      if (status !== 'running' && liveAllocations === 0) {
        log.ok(`job ${jobId} recovered: status=${status}, attempt=${snapshot.attempt}`);
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Not left hanging in Running, and the capacity it held is back in the pool.
    expect(status).not.toBe('running');
    expect(liveAllocations).toBe(0);
    log.ok('the orphan was reclaimed and its reservation released');
  }, 150_000);
});
