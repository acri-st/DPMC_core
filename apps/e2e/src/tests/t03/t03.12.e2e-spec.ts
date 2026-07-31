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

// @plan T03.12 — Fallback behavior when no compatible node is available
// @covers EOCP-E3-02
//
// Description: This test verifies system behavior when no execution node satisfies the task
//   requirements.
// Prerequisites: Only nodes that cannot satisfy the requirements are registered.
// Steps:
//   1. Submit incompatible task → Task is accepted
//   2. Evaluate scheduler decision → No node is selected
//   3. Observe system behavior → Task remains pending or is rejected with clear message

const log = makeLogger('T03.12');

// Far beyond anything any node can advertise, so nothing in the fleet fits.
const IMPOSSIBLE = { cores: 4096, ram: 1_000_000_000_000_000n };
const SETTLE_MS = 20_000;

describe('T03.12 — Fallback behavior when no compatible node is available', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let taskId: number;
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t03-12-small');

  beforeAll(async () => {
    log.step('beforeAll — registering a node that cannot satisfy the task');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({ ...registerPayload(hostname, dataCenterCode), nbCores: 2, ram: 2_000_000_000 });
    expect(res.status).toBe(200);
    hostId = res.body.data.id;
    stopHeartbeats = keepHostsAlive([hostId]);
    log.ok(`node ${hostId} registered with 2 cores`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T03.12
  // @covers EOCP-E3-02
  it('Step 1 – an unsatisfiable task is still accepted', async () => {
    log.step(`Step 1 — submit a task needing ${IMPOSSIBLE.cores} cores`);

    const { processorVersionId } = await createProcessorVersion(`T03.12-${Date.now()}`, IMPOSSIBLE);
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T03.12 – unsatisfiable task');

    const res = await request(API).get(`/task/${taskId}`).set('Cookie', cookie);
    log.http('GET', `/task/${taskId}`, res.status, { status: res.body.data?.status });
    expect(res.status).toBe(200);
    log.ok(`task accepted with status ${res.body.data.status}`);
  }, 60_000);

  // @plan T03.12
  // @covers EOCP-E3-02
  it('Step 2 – no node is selected', async () => {
    log.step(`Step 2 — give the scheduler ${SETTLE_MS}ms, then confirm nothing was placed`);
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    const allocs = await waitForAllocations([taskId], () => true, 5_000);
    log.ok(`allocations for this task: ${JSON.stringify(allocs)}`);
    expect(allocs).toEqual([]);
    log.ok('scheduler placed nothing, as no node fits');
  }, 60_000);

  // @plan T03.12
  // @covers EOCP-E3-02
  it('Step 3 – the job stays pending rather than failing or vanishing', async () => {
    log.step('Step 3 — the job must remain visible and awaiting a node');

    const batches = await request(API).get(`/task/${taskId}/batches`).set('Cookie', cookie);
    expect(batches.status).toBe(200);
    const batchIds = new Set((batches.body.data as Array<{ id: number }>).map((b) => b.id));

    const res = await request(API).get('/job').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const mineJobs = (
      res.body.data as Array<{
        id: number;
        status: string;
        hostId: number | null;
        batchId: number;
      }>
    ).filter((j) => batchIds.has(j.batchId));
    log.ok(
      `jobs for this task: ${JSON.stringify(mineJobs.map((j) => ({ id: j.id, status: j.status })))}`,
    );

    expect(mineJobs.length).toBeGreaterThan(0);
    for (const job of mineJobs) {
      // Pending, not silently dropped and not marked failed.
      expect(job.hostId).toBeNull();
      expect(['Ready', 'Waiting', 'Pending']).toContain(job.status);
    }

    // And the scheduler is still alive after refusing to place it.
    const health = await request(API).get('/status');
    expect(health.status).toBe(200);
    const entry = (health.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');
    log.ok('job still pending and dispatcher still healthy');
  }, 60_000);
});
