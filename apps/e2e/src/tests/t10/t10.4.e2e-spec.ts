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
import { allocationOrder, waitForReadyJobs } from './_shared';

// @plan T10.4 — Dynamic adaptation of execution order under resource pressure
// @covers EOCP-E10-04
//
// Description: This test verifies that the execution order adapts when resources become scarce.
// Prerequisites: Jobs with different priorities are pending.
// Steps:
//   1. Submit mixedpriority jobs → Jobs are scheduled
//   2. Reduce available resources → Resource pressure detected
//   3. Observe scheduler behavior → Execution order is adapted

// Every requirement sits above what the ambient e2e worker advertises so it
// cannot take part, and all tasks are queued *before* the node is registered.
// The first dispatch pass therefore sees the whole queue at once and writes one
// allocation per job in the order it sorted them, so allocation id order is the
// scheduler's execution order.
//
// The node is sized to hold the whole queue rather than one job at a time: no
// worker process backs a synthetic host, so a job placed on it never runs, never
// finishes, and never releases its reservation — a single-slot node would place
// one job and then stall forever.

const log = makeLogger('T10.4');

// One task per class, so the expected order comes from the class weights in
// apps/dispatcher domain/dispatch.CLASS_WEIGHTS (Ultra 1000 > Super 100 >
// NRT 5 > Test 0.5) rather than from the numeric priority alone.
const SUBMISSIONS = [
  { label: 'test', priorityClass: 'Test' as const, priority: 5 },
  { label: 'nrt', priorityClass: 'NRT' as const, priority: 5 },
  { label: 'ultra', priorityClass: 'Ultra' as const, priority: 5 },
  { label: 'super', priorityClass: 'Super' as const, priority: 5 },
];
const EXPECTED_ORDER = ['ultra', 'super', 'nrt', 'test'];

describe('T10.4 — Dynamic adaptation of execution order under resource pressure', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const taskIdByLabel = new Map<string, number>();

  const hostname = uniqueHostname('t10-4-slot');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 4, ram: ceiling.ram + 4_000_000_000n };
    log.ok(`need ${need.cores}c/${need.ram}B`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    const ids = [...taskIdByLabel.values()];
    await releaseTasks(ids);
    for (const id of ids) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T10.4
  // @covers EOCP-E10-04
  it('Step 1 – mixed-priority jobs are submitted', async () => {
    log.step(`Step 1 — submit ${SUBMISSIONS.length} tasks across priority classes`);

    for (const s of SUBMISSIONS) {
      const { processorVersionId } = await createProcessorVersion(
        `T10.4-${s.label}-${Date.now()}`,
        need,
      );
      taskIdByLabel.set(
        s.label,
        await createAndTriggerTask(cookie, processorVersionId, `T10.4 – ${s.label}`, {
          priority: s.priority,
          priorityClass: s.priorityClass,
        }),
      );
    }

    await waitForReadyJobs([...taskIdByLabel.values()]);
    log.ok(`${SUBMISSIONS.length} jobs waiting, no node able to take them yet`);
  }, 240_000);

  // @plan T10.4
  // @covers EOCP-E10-04
  it('Step 2 – capacity is opened and the whole queue is ordered in one pass', async () => {
    log.step('Step 2 — register the node that will serve the queued jobs');

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * SUBMISSIONS.length,
        ram: Number(need.ram * BigInt(SUBMISSIONS.length)),
      });
    expect(res.status).toBe(200);
    hostId = res.body.data.id;
    stopHeartbeats = keepHostsAlive([hostId]);

    const ids = [...taskIdByLabel.values()];
    const deadline = Date.now() + 120_000;
    let order = await allocationOrder(ids);
    while (order.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
      order = await allocationOrder(ids);
    }
    expect(order.length).toBeGreaterThan(0);
    log.ok(`the queue started being served (${order.length} placed so far)`);
  }, 240_000);

  // @plan T10.4
  // @covers EOCP-E10-04
  it('Step 3 – the execution order follows priority, not arrival', async () => {
    log.step('Step 3 — compare the allocation sequence with the expected order');

    const ids = [...taskIdByLabel.values()];
    const byTaskId = new Map([...taskIdByLabel].map(([label, id]) => [id, label]));

    const deadline = Date.now() + 210_000;
    let order = await allocationOrder(ids);
    while (order.length < SUBMISSIONS.length && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(ids);
    }
    const labels = order.map((o) => byTaskId.get(o.taskId));
    log.ok(`observed order: ${labels.join(' → ')}`);

    // Ultra was submitted third and Test first, so arrival order would give a
    // different sequence.
    expect(labels[0]).toBe('ultra');
    expect(labels.at(-1)).toBe('test');
    expect(labels).toEqual(EXPECTED_ORDER);
    log.ok('execution order adapted to priority class under scarcity');
  }, 300_000);
});
