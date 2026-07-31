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
import { allocationOrder, backdateJobs, waitForReadyJobs } from './_shared';

// @plan T10.8 — Scheduler stability under oscillating load
// @covers EOCP-E10-04
//
// Description: This test verifies that the scheduler stays stable and responsive when the
//   submission rate alternates between bursts and lulls.
// Prerequisites: Monitoring of scheduler behavior is available.
// Steps:
//   1. Alternate high and low job submission rates → Load fluctuates
//   2. Observe scheduler behavior → No instability occurs
//   3. Monitor execution metrics → System remains responsive

// Every requirement sits above what the ambient e2e worker advertises so it
// cannot take part, and tasks are queued before capacity is opened: the
// dispatch pass then sees the whole queue and writes one allocation per job in
// the order it sorted them. The node holds the whole queue rather than one job
// at a time — no worker process backs a synthetic host, so a placed job never
// finishes and never releases its reservation.

const log = makeLogger('T10.8');

// Burst, lull, burst, lull — the shape is what is under test, not the volume.
const BURSTS = [5, 1, 5, 1];
const LULL_MS = 5_000;
const RESPONSE_BUDGET_MS = 5_000;

describe('T10.8 — Scheduler stability under oscillating load', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const allTaskIds: number[] = [];
  const responseTimes: number[] = [];

  const hostname = uniqueHostname('t10-8-oscillate');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();
    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 2, ram: ceiling.ram + 1_000_000_000n };
  });

  afterAll(async () => {
    stopHeartbeats?.();
    await releaseTasks(allTaskIds);
    for (const id of allTaskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T10.8
  // @covers EOCP-E10-04
  it('Step 1 – the submission rate alternates between bursts and lulls', async () => {
    log.step(`Step 1 — bursts of ${BURSTS.join(', ')} tasks separated by ${LULL_MS}ms lulls`);

    for (const [wave, size] of BURSTS.entries()) {
      for (let i = 0; i < size; i++) {
        const { processorVersionId } = await createProcessorVersion(
          `T10.8-w${wave}-${i}-${Date.now()}`,
          need,
        );
        allTaskIds.push(
          await createAndTriggerTask(
            cookie,
            processorVersionId,
            `T10.8 – wave ${wave} task ${i}`,
            { priority: 5, priorityClass: 'NRT' },
          ),
        );
      }

      // The scheduler must answer just as quickly at the peak as in the lull.
      const started = Date.now();
      const res = await request(API).get('/status');
      responseTimes.push(Date.now() - started);
      expect(res.status).toBe(200);

      await new Promise((r) => setTimeout(r, LULL_MS));
    }
    log.ok(`${allTaskIds.length} tasks submitted across ${BURSTS.length} waves`);
  }, 300_000);

  // @plan T10.8
  // @covers EOCP-E10-04
  it('Step 2 – no instability: every job is placed exactly once', async () => {
    log.step('Step 2 — open capacity for the whole queue and check the placements');

    await waitForReadyJobs(allTaskIds);
    const count = allTaskIds.length;
    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * count,
        ram: Number(need.ram * BigInt(count)),
        disk: 1_000_000_000_000,
      });
    expect(res.status).toBe(200);
    stopHeartbeats = keepHostsAlive([res.body.data.id]);

    const deadline = Date.now() + 240_000;
    let order = await allocationOrder(allTaskIds);
    while (order.length < count && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(allTaskIds);
    }
    log.ok(`${order.length}/${count} placed`);

    expect(order.length).toBe(count);
    // Double-placing a job under an uneven arrival rate would be the instability
    // this test is looking for.
    const placedTasks = order.map((o) => o.taskId);
    expect(new Set(placedTasks).size).toBe(count);
    log.ok('every job placed exactly once — no duplicate or lost allocation');
  }, 360_000);

  // @plan T10.8
  // @covers EOCP-E10-04
  it('Step 3 – the system stayed responsive throughout', async () => {
    log.step('Step 3 — check the response times sampled at each wave');

    log.ok(`/status response times per wave: ${responseTimes.join(', ')}ms`);
    for (const elapsed of responseTimes) {
      expect(elapsed).toBeLessThan(RESPONSE_BUDGET_MS);
    }

    const status = await request(API).get('/status');
    expect(status.status).toBe(200);
    const entry = (status.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');
    log.ok('dispatcher healthy and API responsive after the oscillating load');
  }, 120_000);
});
