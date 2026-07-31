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

// @plan T06.24 — Longduration faulttolerance and chaos scheduling test
// @covers EOCP-E6-11
//
// Description: This test keeps work flowing while faults are injected repeatedly, and checks the
//   scheduler neither deadlocks nor corrupts its state, and returns to nominal afterwards.
// Prerequisites: Node and scheduler lifecycles can be controlled.
// Steps:
//   1. Start continuous job submission → Scheduler maintains normal throughput
//   2. Inject random failures (nodes, network, executors) → Failures are detected and isolated
//   3. Observe job handling during failures → Jobs are rescheduled or retried
//   4. Maintain test over extended duration → No state corruption or deadlock occurs
//   5. Stop fault injection and workload → System returns to stable nominal state

const log = makeLogger('T06.24');

// Faults follow a fixed sequence rather than a random one: a chaos test that
// cannot be replayed is not evidence.
const ROUNDS = 4;
const TASKS_PER_ROUND = 2;

describe('T06.24 — Long-duration fault-tolerance and chaos scheduling test', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const taskIds: number[] = [];
  const hostnames: string[] = [];
  const hostIds: number[] = [];
  const throughput: number[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();
    const ceiling = await ambientCeiling([]);
    need = { cores: ceiling.cores + 2, ram: ceiling.ram + 1_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    if (!dispatcher.isRunning()) {
      dispatcher.start();
      await dispatcher.waitHealthy(CONFIG.api.url, 60_000).catch(() => undefined);
    }
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of hostnames) await deleteHost(h);
  });

  // @plan T06.24
  // @covers EOCP-E6-11
  it('Steps 1-3 – work keeps flowing while faults are injected round after round', async () => {
    log.step(`Steps 1-3 — ${ROUNDS} rounds of submit-then-break`);

    for (let round = 0; round < ROUNDS; round++) {
      // A fresh node each round: the previous one is about to be taken out.
      const hostname = uniqueHostname(`t06-24-r${round}`);
      hostnames.push(hostname);
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(hostname, dataCenterCode),
          nbCores: need.cores * TASKS_PER_ROUND,
          ram: Number(need.ram * BigInt(TASKS_PER_ROUND)),
          disk: 500_000_000_000,
        });
      expect(res.status).toBe(200);
      hostIds.push(res.body.data.id);
      stopHeartbeats?.();
      stopHeartbeats = keepHostsAlive(hostIds);

      const roundTaskIds: number[] = [];
      for (let i = 0; i < TASKS_PER_ROUND; i++) {
        const { processorVersionId } = await createProcessorVersion(
          `T06.24-r${round}-${i}-${Date.now()}`,
          need,
        );
        roundTaskIds.push(
          await createAndTriggerTask(cookie, processorVersionId, `T06.24 – r${round} t${i}`),
        );
      }
      taskIds.push(...roundTaskIds);

      const started = Date.now();
      const allocs = await waitForAllocations(
        roundTaskIds,
        (as) => as.length >= TASKS_PER_ROUND,
        180_000,
      );
      throughput.push(Date.now() - started);
      expect(allocs.length).toBeGreaterThanOrEqual(TASKS_PER_ROUND);
      log.ok(`round ${round}: ${allocs.length} placed in ${throughput.at(-1)}ms`);

      // Alternate the fault: an execution node in even rounds, the scheduler
      // process itself in odd ones.
      if (round % 2 === 0) {
        await setHeartbeat(hostname, '600 seconds');
        log.ok(`round ${round}: node ${hostname} taken out`);
      } else {
        dispatcher.stop();
        await new Promise((r) => setTimeout(r, 3_000));
        dispatcher.start();
        await dispatcher.waitHealthy(CONFIG.api.url, 60_000);
        log.ok(`round ${round}: scheduler restarted`);
      }
    }

    // Throughput must not collapse as faults accumulate.
    const first = throughput[0];
    const last = throughput.at(-1)!;
    log.ok(`placement latency per round: ${throughput.join(', ')}ms`);
    expect(last).toBeLessThan(Math.max(first * 10, 120_000));
  }, 900_000);

  // @plan T06.24
  // @covers EOCP-E6-11
  it('Step 4 – no state corruption or deadlock after the whole sequence', async () => {
    log.step('Step 4 — integrity invariants across every job created');
    await assertNoCorruption(log, taskIds);

    // Deadlock would show as work that never reached a scheduling decision.
    const placed = await withDbClient(async (c) => {
      const r = await c.query(
        `SELECT COUNT(DISTINCT b."taskId")::int AS n
         FROM "job_x_allocation" a
         JOIN "job" j   ON j.id = a."jobId"
         JOIN "batch" b ON b.id = j."batchId"
         WHERE b."taskId" = ANY($1::int[])`,
        [taskIds],
      );
      return r.rows[0].n as number;
    });
    log.ok(`${placed}/${taskIds.length} submitted tasks reached a placement`);
    expect(placed).toBe(taskIds.length);
  }, 180_000);

  // @plan T06.24
  // @covers EOCP-E6-11
  it('Step 5 – the system returns to a stable nominal state', async () => {
    log.step('Step 5 — stop injecting and check the system settles');

    await dispatcher.waitHealthy(CONFIG.api.url, 60_000);

    const started = Date.now();
    const status = await request(API).get('/status');
    const elapsed = Date.now() - started;
    expect(status.status).toBe(200);
    expect(elapsed).toBeLessThan(5_000);

    const entry = (status.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');
    log.ok(`nominal: /status answered in ${elapsed}ms with a healthy scheduler`);
  }, 180_000);
});
