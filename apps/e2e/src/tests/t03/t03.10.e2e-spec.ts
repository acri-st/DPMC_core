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

// @plan T03.10 — Compatibility filtering is applied before scheduling decisions
// @covers EOCP-E3-02
//
// Description: This test verifies that node compatibility is evaluated before any scheduling
//   decision is taken.
// Prerequisites: Nodes with heterogeneous capabilities are registered.
// Steps:
//   1. Define task with strict requirements → Requirements are registered
//   2. Submit the task → Scheduler evaluates compatibility first
//   3. Observe candidate nodes → Only compatible nodes are considered

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.10');

describe('T03.10 — Compatibility filtering is applied before scheduling decisions', () => {
  let cookie: string;
  let dataCenterCode: string;
  let wrongRuntimeId: number;
  let tooSmallId: number;
  let compatibleId: number;
  let taskId: number;
  let need: { cores: number; ram: bigint; runtime: 'Docker' };
  let stopHeartbeats: (() => void) | undefined;

  const wrongRuntime = uniqueHostname('t03-10-runtime');
  const tooSmall = uniqueHostname('t03-10-small');
  const compatible = uniqueHostname('t03-10-ok');
  const mine = [wrongRuntime, tooSmall, compatible];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling(mine);
    need = { cores: ceiling.cores + 4, ram: ceiling.ram + 4_000_000_000n, runtime: 'Docker' };
    log.ok(`need ${need.cores}c/${need.ram}B on ${need.runtime}`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    for (const h of mine) await deleteHost(h);
  });

  // @plan T03.10
  // @covers EOCP-E3-02
  it('Step 1 – strict task requirements are registered', async () => {
    log.step('Step 1 — register three nodes, each failing a different criterion');

    // Ample capacity but wrong runtime | right runtime but too small | both ok.
    const specs = [
      {
        name: wrongRuntime,
        extra: {
          nbCores: need.cores * 2,
          ram: Number(need.ram * 2n),
          containerRuntime: 'Apptainer',
        },
      },
      {
        name: tooSmall,
        extra: {
          nbCores: need.cores - 2,
          ram: Number(need.ram),
          containerRuntime: 'Docker',
        },
      },
      {
        name: compatible,
        extra: {
          nbCores: need.cores * 2,
          ram: Number(need.ram * 2n),
          containerRuntime: 'Docker',
        },
      },
    ];

    const ids: number[] = [];
    for (const s of specs) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({ ...registerPayload(s.name, dataCenterCode), ...s.extra });
      log.http('POST', `/host/register (${s.name})`, res.status, { id: res.body.data?.id });
      expect(res.status).toBe(200);
      ids.push(res.body.data.id);
    }
    [wrongRuntimeId, tooSmallId, compatibleId] = ids;
    stopHeartbeats = keepHostsAlive(ids);
    log.ok(`runtime-mismatch=${wrongRuntimeId}, too-small=${tooSmallId}, ok=${compatibleId}`);
  });

  // @plan T03.10
  // @covers EOCP-E3-02
  it('Step 2 – the scheduler evaluates compatibility before placing the task', async () => {
    log.step('Step 2 — submit the strictly-constrained task');

    const { processorVersionId } = await createProcessorVersion(`T03.10-${Date.now()}`, need);
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T03.10 – strict requirements');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    log.ok(`placed: ${JSON.stringify(allocs.map((a) => a.hostId))}`);
  }, 180_000);

  // @plan T03.10
  // @covers EOCP-E3-02
  it('Step 3 – only compatible nodes are considered', async () => {
    log.step('Step 3 — neither the wrong-runtime nor the undersized node may be used');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 60_000);
    const hostIds = allocs.map((a) => a.hostId);

    expect(hostIds).toContain(compatibleId);
    expect(hostIds).not.toContain(wrongRuntimeId);
    expect(hostIds).not.toContain(tooSmallId);
    log.ok(`only ${compatibleId} used; runtime and capacity filters both applied`);
  }, 120_000);
});
