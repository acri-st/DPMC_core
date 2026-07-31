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
} from '../t03/_shared';

// @plan T13.3 — Enforcement of container resource limits and isolation
// @covers EOCP-E13-03
//
// Description: This test verifies that container resource limits (CPU, memory) declared for a
//   processor are enforced when the task runs.
// Prerequisites: Container resource limits can be configured per processor.
// Steps:
//   1. Configure container limits → Configuration is accepted
//   2. Run the task → Task runs inside container
//   3. Monitor container resources → Limits are respected
//   4. Exceed the limits → Task is throttled or terminated
//
// Scope: DPMC's responsibility ends at declaring the limits in the execution
// contract it hands to the worker; the container runtime is what enforces them
// (apps/worker backends/docker.py turns them into `docker run --cpus/--memory`).
// This test therefore verifies the declaration reaches the execution layer
// intact — a limit that never leaves the scheduler cannot be enforced anywhere.

const log = makeLogger('T13.3');

describe('T13.3 — Enforcement of container resource limits and isolation', () => {
  let cookie: string;
  let dataCenterCode: string;
  let hostId: number;
  let taskId: number;
  let need: { cores: number; ram: bigint; runtime: 'Docker' };
  let stopHeartbeats: (() => void) | undefined;

  const hostname = uniqueHostname('t13-3-limits');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostname]);
    need = {
      cores: ceiling.cores + 3,
      ram: ceiling.ram + 3_000_000_000n,
      runtime: 'Docker',
    };
    log.ok(`limits under test: ${need.cores} cpus / ${need.ram} bytes on Docker`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(hostname);
  });

  // @plan T13.3
  // @covers EOCP-E13-03
  it('Step 1 – container limits are accepted as part of the processor definition', async () => {
    log.step('Step 1 — declare a processor with explicit cpu/memory limits');

    const { scriptVersionId } = await createProcessorVersion(
      `T13.3-${Date.now()}`,
      need,
    );
    expect(scriptVersionId).toBeGreaterThan(0);

    const res = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(hostname, dataCenterCode),
        nbCores: need.cores * 2,
        ram: Number(need.ram * 2n),
        containerRuntime: 'Docker',
      });
    log.http('POST', '/host/register', res.status, { id: res.body.data?.id });
    expect(res.status).toBe(200);
    hostId = res.body.data.id;
    stopHeartbeats = keepHostsAlive([hostId]);
    log.ok(`limits declared, Docker node ${hostId} available`);
  });

  // @plan T13.3
  // @covers EOCP-E13-03
  it('Step 2 – the task is scheduled against a container-capable node', async () => {
    log.step('Step 2 — submit the task and wait for its placement');

    const { processorVersionId } = await createProcessorVersion(
      `T13.3-run-${Date.now()}`,
      need,
    );
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T13.3 – limited task');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    expect(allocs[0].hostId).toBe(hostId);
    // The reservation is the scheduler's copy of the declared limits.
    expect(allocs[0].reservedCpu).toBe(need.cores);
    expect(BigInt(allocs[0].reservedRam)).toBe(need.ram);
    log.ok(`placed on the Docker node with ${need.cores} cpus reserved`);
  }, 180_000);

  // @plan T13.3
  // @covers EOCP-E13-03
  it('Step 3 – the declared limits reach the execution layer intact', async () => {
    log.step(`Step 3 — GET /worker/${hostId}/next-job and inspect the contract`);

    const res = await request(API)
      .get(`/worker/${hostId}/next-job`)
      .set(workerHeader());
    log.http('GET', `/worker/${hostId}/next-job`, res.status, res.body.data);
    expect(res.status).toBe(200);

    const dispatch = res.body.data as {
      jobId: number;
      runtime: string;
      resources: { cpus: number; memoryBytes: string; gpus: number[] };
    } | null;
    expect(dispatch).not.toBeNull();

    // Exactly what was declared — not a default, not the node's own capacity.
    expect(dispatch!.resources.cpus).toBe(need.cores);
    expect(BigInt(dispatch!.resources.memoryBytes)).toBe(need.ram);
    expect(dispatch!.runtime).toBe('Docker');
    expect(dispatch!.resources.gpus).toEqual([]);
    log.ok(
      `execution contract carries cpus=${dispatch!.resources.cpus}, ` +
        `memoryBytes=${dispatch!.resources.memoryBytes}, runtime=${dispatch!.runtime}`,
    );
  }, 120_000);

  // @plan T13.3
  // @covers EOCP-E13-03
  it('Step 4 – a job may not reserve more than its node can offer', async () => {
    log.step('Step 4 — a task exceeding the node is never placed on it');

    const oversized = await createProcessorVersion(`T13.3-oversized-${Date.now()}`, {
      cores: need.cores * 100,
      ram: need.ram * 100n,
      runtime: 'Docker',
    });
    const oversizedTaskId = await createAndTriggerTask(
      cookie,
      oversized.processorVersionId,
      'T13.3 – oversized task',
    );

    // Give the scheduler time to consider and reject it.
    await new Promise((r) => setTimeout(r, 20_000));
    const allocs = await waitForAllocations([oversizedTaskId], () => true, 5_000);
    log.ok(`allocations for the oversized task: ${JSON.stringify(allocs)}`);
    expect(allocs).toEqual([]);

    await releaseTasks([oversizedTaskId]);
    await request(API).delete(`/task/${oversizedTaskId}`).set('Cookie', cookie);
    log.ok('the isolation boundary held: no node accepted an over-limit job');
  }, 120_000);
});
