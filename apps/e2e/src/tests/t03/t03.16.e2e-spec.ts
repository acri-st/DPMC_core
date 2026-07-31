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
  waitForAllocations,
  workerHeader,
} from './_shared';

// @plan T03.16 — Scalability of node selection logic with large node pools
// @covers EOCP-E3-02
//
// Description: This test verifies that node selection remains efficient when many nodes are
//   registered.
// Prerequisites: A large pool of execution nodes can be registered.
// Steps:
//   1. Register many execution nodes → Nodes are available
//   2. Submit multiple tasks → Scheduler evaluates pool
//   3. Observe performance → Selection remains responsive without degradation

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.16');

const POOL_SIZE = 40;
const TASK_COUNT = 5;
const PLACEMENT_BUDGET_MS = 120_000;

describe('T03.16 — Scalability of node selection logic with large node pools', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const hostIds: number[] = [];
  const hostnames = Array.from({ length: POOL_SIZE }, (_, i) => uniqueHostname(`t03-16-n${i}`));
  const taskIds: number[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling(hostnames);
    need = { cores: ceiling.cores + 2, ram: ceiling.ram + 1_000_000_000n };
    log.ok(`need ${need.cores}c/${need.ram}B`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of hostnames) await deleteHost(h);
  });

  // @plan T03.16
  // @covers EOCP-E3-02
  it('Step 1 – a large pool of nodes registers successfully', async () => {
    log.step(`Step 1 — register ${POOL_SIZE} nodes`);
    const started = Date.now();

    const results = await Promise.all(
      hostnames.map((name, i) =>
        request(API)
          .post('/host/register')
          .set(workerHeader())
          .send({
            ...registerPayload(name, dataCenterCode),
            // Varied sizes so selection has a real pool to sort, not clones.
            nbCores: need.cores + (i % 8),
            ram: Number(need.ram + BigInt(i) * 1_000_000_000n),
          }),
      ),
    );
    for (const res of results) expect(res.status).toBe(200);
    hostIds.push(...results.map((r) => r.body.data.id as number));
    stopHeartbeats = keepHostsAlive(hostIds, 8_000);
    log.ok(`${POOL_SIZE} nodes registered in ${Date.now() - started}ms`);
  }, 180_000);

  // @plan T03.16
  // @covers EOCP-E3-02
  it('Step 2 – the scheduler evaluates the whole pool for several tasks', async () => {
    log.step(`Step 2 — submit ${TASK_COUNT} tasks against the pool`);

    for (let i = 0; i < TASK_COUNT; i++) {
      const { processorVersionId } = await createProcessorVersion(
        `T03.16-${Date.now()}-${i}`,
        need,
      );
      taskIds.push(await createAndTriggerTask(cookie, processorVersionId, `T03.16 – task ${i}`));
    }
    log.ok(`${TASK_COUNT} tasks queued against a ${POOL_SIZE}-node pool`);
  }, 180_000);

  // @plan T03.16
  // @covers EOCP-E3-02
  it('Step 3 – selection stays responsive and correct at that scale', async () => {
    log.step('Step 3 — measure how long the pool takes to place every task');
    const started = Date.now();

    const allocs = await waitForAllocations(
      taskIds,
      (as) => as.length >= TASK_COUNT,
      PLACEMENT_BUDGET_MS,
    );
    const elapsed = Date.now() - started;

    expect(allocs.length).toBeGreaterThanOrEqual(TASK_COUNT);
    for (const a of allocs) expect(hostIds).toContain(a.hostId);
    log.ok(`placed ${allocs.length} task(s) across ${POOL_SIZE} nodes in ${elapsed}ms`);

    const listStarted = Date.now();
    const res = await request(API).get('/host').set('Cookie', cookie);
    const listElapsed = Date.now() - listStarted;
    expect(res.status).toBe(200);
    expect(listElapsed).toBeLessThan(10_000);
    log.ok(`GET /host over ${POOL_SIZE}+ nodes answered in ${listElapsed}ms`);
  }, 240_000);
});
