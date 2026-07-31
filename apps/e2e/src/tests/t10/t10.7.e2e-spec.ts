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

// @plan T10.7 — Fairness under constant highpriority workload
// @covers EOCP-E10-03
//
// Description: This test verifies that a steady stream of high-priority work does not defer
//   lower-priority jobs indefinitely.
// Prerequisites: Priority aging / fairness mechanisms are enabled.
// Steps:
//   1. Continuously submit highpriority jobs → Jobs execute
//   2. Submit lowerpriority jobs → Jobs are queued
//   3. Observe longterm behavior → Lowerpriority jobs execute

// Every requirement sits above what the ambient e2e worker advertises so it
// cannot take part, and tasks are queued before capacity is opened: the
// dispatch pass then sees the whole queue and writes one allocation per job in
// the order it sorted them. The node holds the whole queue rather than one job
// at a time — no worker process backs a synthetic host, so a placed job never
// finishes and never releases its reservation.

const log = makeLogger('T10.7');

const FIRST_WAVE = 3;
const SECOND_WAVE = 3;
// Ageing is capped at AGING_CAP_S, so waiting the full cap is the most a
// deferred job can gain — and it is what lets it clear the NRT stream.
const WAITED_S = AGING_CAP_S;

describe('T10.7 — Fairness under constant high-priority workload', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let lowTaskId: number;
  let stopHeartbeats: (() => void) | undefined;
  const allTaskIds: number[] = [];
  const firstWaveIds: number[] = [];
  const secondWaveIds: number[] = [];

  const hostname = uniqueHostname('t10-7-fair');

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
    await releaseTasks(allTaskIds);
    for (const id of allTaskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  async function submitHigh(label: string, into: number[]) {
    const { processorVersionId } = await createProcessorVersion(
      `T10.7-${label}-${Date.now()}`,
      need,
    );
    const id = await createAndTriggerTask(cookie, processorVersionId, `T10.7 – ${label}`, {
      priority: 9,
      priorityClass: 'NRT',
    });
    into.push(id);
    allTaskIds.push(id);
    return id;
  }

  // @plan T10.7
  // @covers EOCP-E10-03
  it('Step 1 – a stream of high-priority jobs is submitted', async () => {
    log.step(`Step 1 — first wave of ${FIRST_WAVE} high-priority tasks`);

    for (let i = 0; i < FIRST_WAVE; i++) await submitHigh(`wave1-${i}`, firstWaveIds);
    await waitForReadyJobs(firstWaveIds);
    log.ok(`${FIRST_WAVE} high-priority jobs queued`);
  }, 240_000);

  // @plan T10.7
  // @covers EOCP-E10-03
  it('Step 2 – a lower-priority job joins the queue behind them', async () => {
    log.step('Step 2 — queue one low-priority task, then keep the stream coming');

    const low = await createProcessorVersion(`T10.7-low-${Date.now()}`, need);
    lowTaskId = await createAndTriggerTask(
      cookie,
      low.processorVersionId,
      'T10.7 – low priority',
      { priority: 1, priorityClass: 'Test' },
    );
    allTaskIds.push(lowTaskId);
    await waitForReadyJobs([lowTaskId]);

    // The stream does not stop while it waits.
    for (let i = 0; i < SECOND_WAVE; i++) await submitHigh(`wave2-${i}`, secondWaveIds);
    await waitForReadyJobs(secondWaveIds);
    log.ok(`low-priority job ${lowTaskId} is queued behind ${FIRST_WAVE + SECOND_WAVE} high-priority ones`);
  }, 300_000);

  // @plan T10.7
  // @covers EOCP-E10-03
  it('Step 3 – the lower-priority job is served rather than deferred forever', async () => {
    log.step('Step 3 — after waiting, it must clear the high-priority stream');

    // Ageing accrues at 0.01/s, so the crossover is applied to the record
    // rather than waited out in real time.
    await backdateJobs([lowTaskId], WAITED_S);

    const count = allTaskIds.length;
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
    stopHeartbeats = keepHostsAlive([res.body.data.id]);

    const deadline = Date.now() + 180_000;
    let order = await allocationOrder(allTaskIds);
    while (order.length < count && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(allTaskIds);
    }
    log.ok(`order: ${JSON.stringify(order.map((o) => o.taskId))} (low=${lowTaskId})`);

    // Served, and served ahead of the stream that had been overtaking it.
    expect(order.some((o) => o.taskId === lowTaskId)).toBe(true);
    expect(order[0].taskId).toBe(lowTaskId);
    log.ok('the deferred job cleared a continuous high-priority workload');
  }, 300_000);
});
