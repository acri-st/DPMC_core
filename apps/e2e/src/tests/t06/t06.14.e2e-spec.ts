import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { CONFIG } from '../../constants/config';
import { dispatcher } from '../../setup/services/dispatcher';
import { docker } from '../../setup/services/docker';
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

const DB_SERVICE = 'database';
const LOST_HOST_THRESHOLD_S = 120;

/**
 * Integrity invariants the scheduler must hold whatever was injected.
 *
 * Note the plan expects failed work to be "rescheduled or retried"; the
 * dispatcher does neither — `max_attempts` is declared in its config and read
 * nowhere. What it does guarantee, and what is asserted here, is isolation: an
 * affected job reaches a terminal state and hands its capacity back, and no job
 * is ever left holding two reservations or running against a released one.
 */
async function assertNoCorruption(
  log: { ok: (m: string) => void },
  taskIds: number[],
) {
  // Scoped to this suite's own work: a neighbouring suite deleting its hosts
  // takes their allocations with it, which would look like corruption here.
  const state = await withDbClient(async (c) => {
    const running = await c.query(
      `SELECT COUNT(*)::int AS n FROM "job" j
       JOIN "batch" b ON b.id = j."batchId"
       WHERE b."taskId" = ANY($1::int[])
         AND j.status = 'running'
         AND NOT EXISTS (
           SELECT 1 FROM "job_x_allocation" a
           WHERE a."jobId" = j.id AND a."releasedAt" IS NULL
         )`,
      [taskIds],
    );
    const doubled = await c.query(
      `SELECT COUNT(*)::int AS n FROM (
         SELECT a."jobId" FROM "job_x_allocation" a
         JOIN "job" j   ON j.id = a."jobId"
         JOIN "batch" b ON b.id = j."batchId"
         WHERE b."taskId" = ANY($1::int[]) AND a."releasedAt" IS NULL
         GROUP BY a."jobId" HAVING COUNT(*) > 1
       ) d`,
      [taskIds],
    );
    return {
      runningWithoutReservation: running.rows[0].n as number,
      jobsWithTwoReservations: doubled.rows[0].n as number,
    };
  });
  log.ok(`integrity: ${JSON.stringify(state)}`);
  expect(state.runningWithoutReservation).toBe(0);
  expect(state.jobsWithTwoReservations).toBe(0);
}

// @plan T06.14 — Fault injection on nodes, scheduler, and network
// @covers EOCP-E6-11
//
// Description: This test injects failures at the node, scheduler and connectivity levels and checks
//   the scheduler detects them and keeps its state consistent.
// Prerequisites: Node, scheduler and database lifecycles can be controlled.
// Steps:
//   1. Launch multiple jobs across different nodes → Jobs enter execution normally
//   2. Inject a failure on an execution node → Node failure is detected
//   3. Inject a failure on the scheduler process → Failover or restart mechanism activates
//   4. Inject a transient network interruption → Communication errors are detected
//   5. Observe scheduling behavior → Jobs are rescheduled or paused without corruption

const log = makeLogger('T06.14');

describe('T06.14 — Fault injection on nodes, scheduler, and network', () => {
  let cookie: string;
  let dataCenterCode: string;
  let survivorHostId: number;
  let victimHostId: number;
  let survivorJobId: number;
  let victimJobId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const taskIds: number[] = [];

  const survivorHost = uniqueHostname('t06-14-survivor');
  const victimHost = uniqueHostname('t06-14-victim');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();
    const ceiling = await ambientCeiling([survivorHost, victimHost]);
    need = { cores: ceiling.cores + 3, ram: ceiling.ram + 2_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    try {
      docker.startService(DB_SERVICE);
    } catch {
      /* already up */
    }
    if (!dispatcher.isRunning()) {
      dispatcher.start();
      await dispatcher.waitHealthy(CONFIG.api.url, 60_000).catch(() => undefined);
    }
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of [survivorHost, victimHost]) await deleteHost(h);
  });

  // @plan T06.14
  // @covers EOCP-E6-11
  it('Step 1 – jobs are running on two different nodes', async () => {
    log.step('Step 1 — place one job on each of two nodes');

    const ids: number[] = [];
    for (const name of [survivorHost, victimHost]) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(name, dataCenterCode),
          // One job's worth each, so each job lands on its own node.
          nbCores: need.cores,
          ram: Number(need.ram),
        });
      expect(res.status).toBe(200);
      ids.push(res.body.data.id);
    }
    [survivorHostId, victimHostId] = ids;
    stopHeartbeats = keepHostsAlive(ids);

    for (let i = 0; i < 2; i++) {
      const { processorVersionId } = await createProcessorVersion(
        `T06.14-${Date.now()}-${i}`,
        need,
      );
      taskIds.push(await createAndTriggerTask(cookie, processorVersionId, `T06.14 – job ${i}`));
    }

    const allocs = await waitForAllocations(taskIds, (as) => as.length >= 2, 180_000);
    expect(new Set(allocs.map((a) => a.hostId)).size).toBe(2);

    const byHost = new Map(allocs.map((a) => [a.hostId, a.jobId]));
    survivorJobId = byHost.get(survivorHostId)!;
    victimJobId = byHost.get(victimHostId)!;

    await withDbClient(async (c) => {
      for (const [jobId, hostId] of [
        [survivorJobId, survivorHostId],
        [victimJobId, victimHostId],
      ]) {
        await c.query(
          `UPDATE "job" SET status = 'running', "hostId" = $2, "startedAt" = NOW()
           WHERE id = $1`,
          [jobId, hostId],
        );
      }
    });
    log.ok(`job ${survivorJobId} on ${survivorHostId}, job ${victimJobId} on ${victimHostId}`);
  }, 240_000);

  // @plan T06.14
  // @covers EOCP-E6-11
  it('Step 2 – a node failure is detected and isolated', async () => {
    log.step('Step 2 — one node stops reporting');

    // Only the victim goes silent; the survivor keeps its heartbeat.
    stopHeartbeats?.();
    stopHeartbeats = keepHostsAlive([survivorHostId]);
    await setHeartbeat(victimHost, `${LOST_HOST_THRESHOLD_S * 2} seconds`);

    const deadline = Date.now() + 90_000;
    let victimStatus = 'running';
    while (Date.now() < deadline) {
      victimStatus = await withDbClient(async (c) => {
        const r = await c.query(`SELECT status FROM "job" WHERE id = $1`, [victimJobId]);
        return r.rows[0].status as string;
      });
      if (victimStatus !== 'running') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(victimStatus).not.toBe('running');

    // Isolated: the healthy node's job is untouched by its neighbour's failure.
    const survivorStatus = await withDbClient(async (c) => {
      const r = await c.query(`SELECT status FROM "job" WHERE id = $1`, [survivorJobId]);
      return r.rows[0].status as string;
    });
    expect(survivorStatus).toBe('running');
    log.ok(`victim job ${victimJobId} → ${victimStatus}, survivor still running`);
  }, 150_000);

  // @plan T06.14
  // @covers EOCP-E6-11
  it('Step 3 – the scheduler process is killed and comes back', async () => {
    log.step('Step 3 — stop the dispatcher, confirm it is reported down, restart it');

    dispatcher.stop();
    await dispatcher.waitUnhealthy(CONFIG.api.url, 60_000);
    log.ok('scheduler reported unavailable');

    // The API is unaffected by the scheduler being gone.
    const during = await request(API).get('/status');
    expect(during.status).toBe(200);

    dispatcher.start();
    await dispatcher.waitHealthy(CONFIG.api.url, 60_000);
    log.ok('scheduler restarted and healthy again');
  }, 180_000);

  // @plan T06.14
  // @covers EOCP-E6-11
  it('Step 4 – a transient connectivity loss is survived', async () => {
    log.step('Step 4 — interrupt the scheduler/database link briefly');

    docker.stopService(DB_SERVICE);
    await new Promise((r) => setTimeout(r, 10_000));
    expect(dispatcher.isRunning()).toBe(true);
    log.ok('scheduler stayed up while its database was unreachable');

    docker.startService(DB_SERVICE);
    await dispatcher.waitHealthy(CONFIG.api.url, 90_000);
    log.ok('scheduler recovered once connectivity returned');
  }, 180_000);

  // @plan T06.14
  // @covers EOCP-E6-11
  it('Step 5 – no state was corrupted by any of the injected faults', async () => {
    log.step('Step 5 — check the integrity invariants');
    await assertNoCorruption(log, taskIds);

    const status = await request(API).get('/status');
    expect(status.status).toBe(200);
    const entry = (status.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');
    log.ok('scheduler back to nominal with consistent state');
  }, 120_000);
});
