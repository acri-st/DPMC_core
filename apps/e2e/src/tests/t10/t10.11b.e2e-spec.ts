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
  PROJECT_ID,
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

// @plan T10.11b — Dynamic update of project priority weights
// @covers EOCP-E10-02
//
// Description: This test verifies that changing a project's scheduling weight takes effect on
//   pending work without restarting the scheduler.
// Prerequisites: Projects expose a configurable priority weight.
// Steps:
//   1. Change project weight → Change is accepted
//   2. Inspect configuration → New weight is applied
//   3. Observe scheduling → Execution adapts dynamically
//
// Both requirements sit above what the ambient e2e worker advertises so it
// cannot take part, and the tasks are queued before capacity is opened: the
// dispatch pass then sees both jobs and writes their allocations in the order
// it sorted them. The node holds both — no worker process backs a synthetic
// host, so a placed job never finishes and never releases its reservation.

const log = makeLogger('T10.11b');

const RAISED_WEIGHT = 20;

describe('T10.11b — Dynamic update of project priority weights', () => {
  let cookie: string;
  let dataCenterCode: string;
  let promotedProjectId: number;
  let steadyProjectId: number;
  let promotedTaskId: number;
  let steadyTaskId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t10-11b-weight');

  beforeAll(async () => {
    log.step('beforeAll — two projects starting from the same weight');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostname]);
    need = { cores: ceiling.cores + 3, ram: ceiling.ram + 2_000_000_000n };

    const suffix = Date.now();
    promotedProjectId = await createProject(cookie, `t1011b-promoted-${suffix}`, 1);
    steadyProjectId = await createProject(cookie, `t1011b-steady-${suffix}`, 1);
    log.ok(`projects ${promotedProjectId} and ${steadyProjectId}, both at weight 1`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // The current project is session state on the admin user; leaving it on a
    // test project would follow every later suite.
    await selectProject(cookie, PROJECT_ID);
    await releaseTasks([promotedTaskId, steadyTaskId].filter(Boolean));
    for (const id of [promotedTaskId, steadyTaskId]) {
      if (id) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    await deleteHost(hostname);
  });

  // @plan T10.11b
  // @covers EOCP-E10-02
  it('Step 1 – a project weight change is accepted', async () => {
    log.step('Step 1 — queue one job per project, then raise one project weight');

    const steady = await createProcessorVersion(`T10.11b-steady-${Date.now()}`, need);
    await selectProject(cookie, steadyProjectId);
    steadyTaskId = await createAndTriggerTask(
      cookie,
      steady.processorVersionId,
      'T10.11b – steady project',
      { priority: 5, priorityClass: 'NRT' },
    );

    const promoted = await createProcessorVersion(`T10.11b-promoted-${Date.now()}`, need);
    await selectProject(cookie, promotedProjectId);
    promotedTaskId = await createAndTriggerTask(
      cookie,
      promoted.processorVersionId,
      'T10.11b – promoted project',
      { priority: 5, priorityClass: 'NRT' },
    );
    await waitForReadyJobs([steadyTaskId, promotedTaskId]);

    // The change lands while both jobs are already queued.
    const res = await request(API)
      .patch(`/project/${promotedProjectId}`)
      .set('Cookie', cookie)
      .send({ priorityWeight: RAISED_WEIGHT });
    log.http('PATCH', `/project/${promotedProjectId}`, res.status, {
      priorityWeight: res.body.data?.priorityWeight,
    });
    expect(res.status).toBe(200);
    log.ok(`weight raised to ${RAISED_WEIGHT} on a project with work already pending`);
  }, 240_000);

  // @plan T10.11b
  // @covers EOCP-E10-02
  it('Step 2 – the new weight is persisted and readable', async () => {
    log.step('Step 2 — read both projects back');

    const [promoted, steady] = await Promise.all([
      request(API).get(`/project/${promotedProjectId}`).set('Cookie', cookie),
      request(API).get(`/project/${steadyProjectId}`).set('Cookie', cookie),
    ]);
    expect(promoted.status).toBe(200);
    expect(steady.status).toBe(200);

    expect(promoted.body.data.priorityWeight).toBe(RAISED_WEIGHT);
    expect(steady.body.data.priorityWeight).toBe(1);
    log.ok(`promoted=${RAISED_WEIGHT}, steady=1`);
  });

  // @plan T10.11b
  // @covers EOCP-E10-02
  it('Step 3 – scheduling adapts to the new weight without a restart', async () => {
    log.step('Step 3 — open capacity and check which project is served first');

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

    const ids = [steadyTaskId, promotedTaskId];
    const deadline = Date.now() + 150_000;
    let order = await allocationOrder(ids);
    while (order.length < 2 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      order = await allocationOrder(ids);
    }
    log.ok(
      `order: ${JSON.stringify(order.map((o) => o.taskId))} ` +
        `(promoted=${promotedTaskId}, steady=${steadyTaskId})`,
    );

    expect(order.length).toBe(2);
    // Same priority and class on both sides, and the weights were equal when
    // the jobs were queued — only the update can explain the ordering.
    expect(order[0].taskId).toBe(promotedTaskId);
    log.ok('the scheduler picked up the new weight without being restarted');
  }, 240_000);
});
