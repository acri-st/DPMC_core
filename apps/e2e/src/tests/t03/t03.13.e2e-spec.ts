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

// @plan T03.13 — Load balancing across multiple compatible nodes
// @covers EOCP-E3-02, EOCP-E3-06
//
// Description: This test verifies that the scheduler distributes tasks across equally compatible
//   nodes instead of overloading one.
// Prerequisites: Several identical nodes are registered.
// Steps:
//   1. Submit several identical tasks → Tasks are queued
//   2. Observe node assignment → Tasks are distributed across nodes
//   3. Monitor usage → Load is balanced

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.13');

const NODE_COUNT = 3;
const TASK_COUNT = 6;
const PER_NODE = TASK_COUNT / NODE_COUNT;

describe('T03.13 — Load balancing across multiple compatible nodes', () => {
  let cookie: string;
  let dataCenterCode: string;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const hostIds: number[] = [];
  const hostnames = Array.from({ length: NODE_COUNT }, (_, i) =>
    uniqueHostname(`t03-13-node${i}`),
  );
  const taskIds: number[] = [];

  beforeAll(async () => {
    log.step('beforeAll — registering identical nodes');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling(hostnames);
    need = { cores: ceiling.cores + 2, ram: ceiling.ram + 1_000_000_000n };

    // Each node holds exactly PER_NODE tasks, so the batch fits the fleet only
    // if the scheduler spreads it.
    for (const name of hostnames) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(name, dataCenterCode),
          nbCores: need.cores * PER_NODE,
          ram: Number(need.ram * BigInt(PER_NODE)),
          disk: 500_000_000_000,
        });
      expect(res.status).toBe(200);
      hostIds.push(res.body.data.id);
    }
    stopHeartbeats = keepHostsAlive(hostIds);
    log.ok(`${NODE_COUNT} nodes holding ${PER_NODE} task(s) each: ${hostIds.join(', ')}`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of hostnames) await deleteHost(h);
  });

  // @plan T03.13
  // @covers EOCP-E3-02, EOCP-E3-06
  it('Step 1 – several identical tasks are queued', async () => {
    log.step(`Step 1 — submit ${TASK_COUNT} identical tasks`);

    for (let i = 0; i < TASK_COUNT; i++) {
      const { processorVersionId } = await createProcessorVersion(
        `T03.13-${Date.now()}-${i}`,
        need,
      );
      taskIds.push(await createAndTriggerTask(cookie, processorVersionId, `T03.13 – task ${i}`));
    }
    expect(taskIds.length).toBe(TASK_COUNT);
    log.ok(`${TASK_COUNT} tasks queued`);
  }, 180_000);

  // @plan T03.13
  // @covers EOCP-E3-02, EOCP-E3-06
  it('Step 2 – the tasks are distributed across the nodes', async () => {
    log.step('Step 2 — wait for every task to be placed');

    const allocs = await waitForAllocations(taskIds, (as) => as.length >= TASK_COUNT, 180_000);
    const used = new Set(allocs.map((a) => a.hostId));
    log.ok(`placements: ${JSON.stringify(allocs.map((a) => a.hostId))}`);

    expect(used.size).toBeGreaterThan(1);
    for (const a of allocs) expect(hostIds).toContain(a.hostId);
    log.ok(`work spread over ${used.size} of ${NODE_COUNT} nodes`);
  }, 240_000);

  // @plan T03.13
  // @covers EOCP-E3-02, EOCP-E3-06
  it('Step 3 – no node carries a disproportionate share', async () => {
    log.step('Step 3 — compare per-node load');

    const allocs = await waitForAllocations(taskIds, (as) => as.length >= TASK_COUNT, 60_000);
    const perHost = new Map<number, number>();
    for (const a of allocs) perHost.set(a.hostId, (perHost.get(a.hostId) ?? 0) + 1);
    log.ok(`per-node counts: ${JSON.stringify([...perHost.entries()])}`);

    const counts = [...perHost.values()];
    // Worst-fit placement keeps the fleet within one task of perfect balance.
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    log.ok(`balanced: busiest ${Math.max(...counts)}, quietest ${Math.min(...counts)}`);
  }, 120_000);
});
