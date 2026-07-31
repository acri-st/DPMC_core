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
import {
  allocationOrder,
  createProject,
  selectProject,
  waitForReadyJobs,
} from './_shared';
import { PROJECT_ID } from '../t03/_shared';

// @plan T10.3 — Fair resource sharing using projectlevel weights
// @covers EOCP-E10-02
//
// Description: This test verifies that project-level weights influence resource sharing between
//   concurrent productions.
// Prerequisites: Two projects with different scheduling weights exist.
// Steps:
//   1. Submit jobs from both projects → Jobs enter queues
//   2. Observe scheduling behavior → Higherweight project favored
//   3. Monitor execution over time → Lowerweight project still progresses

// Both requirements sit above what the ambient e2e worker advertises so it
// cannot take part, and both tasks are queued *before* the node is registered.
// The first dispatch pass therefore sees both jobs and writes their allocations
// in the order it sorted them, so allocation id order is the scheduling order.
//
// The node holds both jobs rather than one: no worker process backs a synthetic
// host, so a placed job never runs and never releases its reservation.

const log = makeLogger('T10.3');

const HEAVY_WEIGHT = 10;
const LIGHT_WEIGHT = 1;

describe('T10.3 — Fair resource sharing using project-level weights', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let heavyProjectId: number;
  let lightProjectId: number;
  let heavyTaskId: number;
  let lightTaskId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t10-3-slot');

  beforeAll(async () => {
    log.step('beforeAll — two projects with different weights');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 4, ram: ceiling.ram + 4_000_000_000n };

    const suffix = Date.now();
    heavyProjectId = await createProject(cookie, `t103-heavy-${suffix}`, HEAVY_WEIGHT);
    lightProjectId = await createProject(cookie, `t103-light-${suffix}`, LIGHT_WEIGHT);
    log.ok(`heavy project ${heavyProjectId} (w=${HEAVY_WEIGHT}), light ${lightProjectId} (w=${LIGHT_WEIGHT})`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // The current project is session state on the admin user, not a per-request
    // value: leaving it pointing at a weight-10 project would silently scale
    // every later suite's effective priorities by ten.
    await selectProject(cookie, PROJECT_ID);
    await releaseTasks([heavyTaskId, lightTaskId].filter(Boolean));
    for (const id of [heavyTaskId, lightTaskId]) {
      if (id) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    await deleteHost(hostname);
  });

  // @plan T10.3
  // @covers EOCP-E10-02
  it('Step 1 – equal-priority jobs from both projects enter the queue', async () => {
    log.step('Step 1 — one task per project, same priority and class');

    // Same priority and class on both sides: the only thing that can separate
    // them is the project weight.
    const light = await createProcessorVersion(`T10.3-light-${Date.now()}`, need);
    // The task lands in the session's current project, so the session is
    // switched between the two creations.
    await selectProject(cookie, lightProjectId);
    lightTaskId = await createAndTriggerTask(
      cookie,
      light.processorVersionId,
      'T10.3 – light-weight project',
      { priority: 5, priorityClass: 'NRT' },
    );

    const heavy = await createProcessorVersion(`T10.3-heavy-${Date.now()}`, need);
    await selectProject(cookie, heavyProjectId);
    heavyTaskId = await createAndTriggerTask(
      cookie,
      heavy.processorVersionId,
      'T10.3 – heavy-weight project',
      { priority: 5, priorityClass: 'NRT' },
    );

    await waitForReadyJobs([lightTaskId, heavyTaskId]);
    log.ok('both projects have a job waiting in the queue');
  }, 180_000);

  // @plan T10.3
  // @covers EOCP-E10-02
  it('Step 2 – the higher-weight project is served first', async () => {
    log.step('Step 2 — open capacity for both jobs and see who is served first');

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

    const deadline = Date.now() + 120_000;
    let order = await allocationOrder([lightTaskId, heavyTaskId]);
    while (order.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
      order = await allocationOrder([lightTaskId, heavyTaskId]);
    }
    log.ok(`allocation order: ${JSON.stringify(order.map((o) => o.taskId))}`);

    expect(order.length).toBeGreaterThan(0);
    expect(order[0].taskId).toBe(heavyTaskId);
    log.ok(`project weight ${HEAVY_WEIGHT} was served before weight ${LIGHT_WEIGHT}`);
  }, 180_000);

  // @plan T10.3
  // @covers EOCP-E10-02
  it('Step 3 – the lower-weight project still progresses', async () => {
    log.step('Step 3 — the light project must be served too, not starved');

    const deadline = Date.now() + 150_000;
    let order = await allocationOrder([lightTaskId, heavyTaskId]);
    while (!order.some((o) => o.taskId === lightTaskId) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder([lightTaskId, heavyTaskId]);
    }
    log.ok(`allocation order: ${JSON.stringify(order.map((o) => o.taskId))}`);

    // Favoured, not exclusive: the lighter project runs once the slot frees.
    expect(order.some((o) => o.taskId === lightTaskId)).toBe(true);
    log.ok('the lower-weight project was served too');
  }, 210_000);
});
