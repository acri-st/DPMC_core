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

// @plan T10.6 — Enforcement of maximum priority caps
// @covers EOCP-E10-02
//
// Description: This test verifies that priority aging is bounded, so a long-waiting job cannot grow
//   past the ceiling and outrank genuinely critical work.
// Prerequisites: A maximum priority cap is configured.
// Steps:
//   1. Submit a lowpriority job → Job is queued
//   2. Allow priority aging over time → Priority increases
//   3. Inspect effective priority → Priority does not exceed cap

// Every requirement sits above what the ambient e2e worker advertises so it
// cannot take part, and the tasks are queued *before* the node is registered:
// the first dispatch pass then sees the whole queue and writes one allocation
// per job in the order it sorted them, so allocation id order is the execution
// order. The node holds the whole queue rather than one job at a time — no
// worker process backs a synthetic host, so a placed job never finishes and
// never releases its reservation.

const log = makeLogger('T10.6');

// The dispatcher caps the ageing term at AGING_CAP_S seconds of wait
// (domain/dispatch.effective_priority), so the most ageing can ever contribute
// is 0.01 x AGING_CAP_S = 864. A fresh Ultra job scores 5 x 1000 = 5000 and
// must stay ahead. Waiting 30 days would score 25 920 uncapped — far past it.
const ANCIENT_S = 30 * 24 * 3_600;
const MAX_AGING_BONUS = 0.01 * AGING_CAP_S;
const ULTRA_SCORE = 5 * 1000;

describe('T10.6 — Enforcement of maximum priority caps', () => {
  let cookie: string;
  let dataCenterCode: string;
  let ancientTaskId: number;
  let ultraTaskId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t10-6-cap');

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
    await releaseTasks([ancientTaskId, ultraTaskId].filter(Boolean));
    for (const id of [ancientTaskId, ultraTaskId]) {
      if (id) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    await deleteHost(hostname);
  });

  // @plan T10.6
  // @covers EOCP-E10-02
  it('Step 1 – a low-priority job is queued', async () => {
    log.step('Step 1 — queue a minimal-priority job');

    const low = await createProcessorVersion(`T10.6-low-${Date.now()}`, need);
    ancientTaskId = await createAndTriggerTask(
      cookie,
      low.processorVersionId,
      'T10.6 – long-waiting job',
      { priority: 1, priorityClass: 'Test' },
    );
    await waitForReadyJobs([ancientTaskId]);
    log.ok(`job for task ${ancientTaskId} is queued`);
  }, 180_000);

  // @plan T10.6
  // @covers EOCP-E10-02
  it('Step 2 – it accumulates far more waiting time than the cap allows', async () => {
    log.step(`Step 2 — age it by ${ANCIENT_S}s, well beyond the ${AGING_CAP_S}s cap`);

    await backdateJobs([ancientTaskId], ANCIENT_S);

    const ultra = await createProcessorVersion(`T10.6-ultra-${Date.now()}`, need);
    ultraTaskId = await createAndTriggerTask(
      cookie,
      ultra.processorVersionId,
      'T10.6 – critical job',
      { priority: 5, priorityClass: 'Ultra' },
    );
    await waitForReadyJobs([ultraTaskId]);
    log.ok(`a fresh Ultra job (task ${ultraTaskId}) now competes with it`);
  }, 180_000);

  // @plan T10.6
  // @covers EOCP-E10-02
  it('Step 3 – the aged job does not outrank the critical one', async () => {
    log.step('Step 3 — open capacity for both and compare the order');

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

    const ids = [ancientTaskId, ultraTaskId];
    const deadline = Date.now() + 150_000;
    let order = await allocationOrder(ids);
    while (order.length < 2 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(ids);
    }
    log.ok(`order: ${JSON.stringify(order.map((o) => o.taskId))} (ancient=${ancientTaskId}, ultra=${ultraTaskId})`);

    expect(order.length).toBe(2);
    // Uncapped, 30 days of waiting would score 25 920 and win; capped it tops
    // out at 864, so the Ultra job stays ahead.
    expect(MAX_AGING_BONUS).toBeLessThan(ULTRA_SCORE);
    expect(order[0].taskId).toBe(ultraTaskId);
    log.ok(`ageing stayed within its ${MAX_AGING_BONUS} ceiling — the critical job ran first`);
  }, 240_000);
});
