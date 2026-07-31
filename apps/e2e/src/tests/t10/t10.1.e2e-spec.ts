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
  uniqueHostname,
  workerHeader,
} from '../t03/_shared';
import { AGING_CAP_S, allocationOrder, backdateJobs, waitForReadyJobs } from './_shared';

// @plan T10.1 — Priority aging to prevent job starvation
// @covers EOCP-E10-03
//
// Description: This test verifies that a low-priority job gains effective priority as it waits, so
//   a steady stream of higher-priority work cannot starve it indefinitely.
// Prerequisites: Priority aging is enabled.
// Steps:
//   1. Submit a lowpriority job → Job enters queue
//   2. Continuously submit highpriority jobs → Highpriority jobs execute
//   3. Observe lowpriority job over time → Effective priority increases
//   4. Observe execution → Lowpriority job is eventually executed

// Every requirement sits above what the ambient e2e worker advertises so it
// cannot take part, and the tasks are queued *before* the node is registered:
// the first dispatch pass then sees the whole queue and writes one allocation
// per job in the order it sorted them, so allocation id order is the execution
// order. The node holds the whole queue rather than one job at a time — no
// worker process backs a synthetic host, so a placed job never finishes and
// never releases its reservation.

const log = makeLogger('T10.1');

const HIGH_COUNT = 3;
// Ageing accrues at 0.01/s and is capped at AGING_CAP_S, so the most it can
// ever contribute is 864. Waiting the full cap is what lets a Test-class job
// (1 x 0.5) overtake an NRT one (9 x 5.0) — and it is also the boundary of the
// anti-starvation guarantee: a Super or Ultra job scores in the thousands and
// can never be overtaken by ageing alone.
const WAITED_S = AGING_CAP_S;

describe('T10.1 — Priority aging to prevent job starvation', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const allTaskIds: number[] = [];
  const hostnames: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();
    const ceiling = await ambientCeiling([]);
    need = { cores: ceiling.cores + 3, ram: ceiling.ram + 2_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    await releaseTasks(allTaskIds);
    for (const id of allTaskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of hostnames) await deleteHost(h);
  });

  /** Queue one low-priority task plus HIGH_COUNT high-priority ones. */
  async function queueRound(label: string) {
    const low = await createProcessorVersion(`T10.1-${label}-low-${Date.now()}`, need);
    const lowTaskId = await createAndTriggerTask(
      cookie,
      low.processorVersionId,
      `T10.1 ${label} – low priority`,
      { priority: 1, priorityClass: 'Test' },
    );
    const highTaskIds: number[] = [];
    for (let i = 0; i < HIGH_COUNT; i++) {
      const high = await createProcessorVersion(`T10.1-${label}-high${i}-${Date.now()}`, need);
      highTaskIds.push(
        await createAndTriggerTask(
          cookie,
          high.processorVersionId,
          `T10.1 ${label} – high priority ${i}`,
          { priority: 9, priorityClass: 'NRT' },
        ),
      );
    }
    const ids = [lowTaskId, ...highTaskIds];
    allTaskIds.push(...ids);
    await waitForReadyJobs(ids);
    return { lowTaskId, highTaskIds, ids };
  }

  /** Open enough capacity for `count` jobs and return the placement order. */
  async function serve(label: string, ids: number[], count: number) {
    const hostname = uniqueHostname(`t10-1-${label}`);
    hostnames.push(hostname);
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * count,
        ram: Number(need.ram * BigInt(count)),
        disk: 500_000_000_000,
      });
    expect(res.status).toBe(200);
    const hostId = res.body.data.id as number;
    stopHeartbeats?.();
    stopHeartbeats = keepHostsAlive([hostId]);

    const deadline = Date.now() + 150_000;
    let order = await allocationOrder(ids);
    while (order.length < count && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(ids);
    }
    return order;
  }

  // @plan T10.1
  // @covers EOCP-E10-03
  it('Step 1 – a fresh low-priority job queues behind the high-priority work', async () => {
    log.step('Step 1 — baseline: no ageing yet, so priority decides alone');

    const { lowTaskId, ids } = await queueRound('baseline');
    const order = await serve('baseline', ids, ids.length);
    log.ok(`baseline order: ${JSON.stringify(order.map((o) => o.taskId))} (low=${lowTaskId})`);

    expect(order.length).toBe(ids.length);
    expect(order.at(-1)!.taskId).toBe(lowTaskId);
    log.ok('without ageing the low-priority job is served last');
  }, 300_000);

  // @plan T10.1
  // @covers EOCP-E10-03
  it('Steps 2-4 – after waiting, the low-priority job overtakes and is executed', async () => {
    log.step(`Steps 2-4 — same queue, but the low-priority job has waited ${WAITED_S}s`);

    const { lowTaskId, ids } = await queueRound('aged');
    // Ageing is 0.01 per second of wait: reaching the crossover by real time
    // would take over an hour, so the wait is applied to the record instead.
    await backdateJobs([lowTaskId], WAITED_S);

    const order = await serve('aged', ids, ids.length);
    log.ok(`aged order: ${JSON.stringify(order.map((o) => o.taskId))} (low=${lowTaskId})`);

    expect(order.length).toBe(ids.length);
    // Its effective priority rose above the fresh high-priority jobs, and it ran.
    expect(order[0].taskId).toBe(lowTaskId);
    log.ok('the aged low-priority job was served first — no starvation');
  }, 300_000);
});
