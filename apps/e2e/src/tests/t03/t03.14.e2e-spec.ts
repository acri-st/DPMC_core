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

// @plan T03.14 — Dynamic exclusion of overloaded nodes
// @covers EOCP-E3-07
//
// Description: This test verifies that nodes reporting high resource usage are temporarily excluded
//   from scheduling.
// Prerequisites: Monitoring of node load is active.
// Steps:
//   1. Increase load on a node → Node reports high usage
//   2. Submit new tasks → Scheduler evaluates node load
//   3. Observe assignment → Overloaded node is excluded

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.14');

describe('T03.14 — Dynamic exclusion of overloaded nodes', () => {
  let cookie: string;
  let dataCenterCode: string;
  let firstHostId: number;
  let secondHostId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const taskIds: number[] = [];

  const hostA = uniqueHostname('t03-14-a');
  const hostB = uniqueHostname('t03-14-b');

  beforeAll(async () => {
    log.step('beforeAll — registering two equal nodes');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([hostA, hostB]);
    need = { cores: ceiling.cores + 4, ram: ceiling.ram + 4_000_000_000n };

    const ids: number[] = [];
    for (const name of [hostA, hostB]) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(name, dataCenterCode),
          // Exactly one task's worth of capacity, so a node already holding one
          // has nothing left for a second.
          nbCores: need.cores,
          ram: Number(need.ram),
        });
      expect(res.status).toBe(200);
      ids.push(res.body.data.id);
    }
    [firstHostId, secondHostId] = ids;
    stopHeartbeats = keepHostsAlive(ids);
    log.ok(`nodes ${firstHostId} and ${secondHostId}, ${need.cores} cores each`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of [hostA, hostB]) await deleteHost(h);
  });

  // @plan T03.14
  // @covers EOCP-E3-07
  it('Step 1 – two node-sized tasks are submitted together', async () => {
    log.step('Step 1 — submit two tasks, each consuming a whole node');

    // Submitted together so both are pending in the same dispatch pass: the
    // scheduler has to account for what it just committed to the first node
    // while placing the second. Jobs here fail fast (no real processor behind
    // the fixture script) and their reservation is released, so submitting them
    // one after the other would simply find both nodes free again.
    for (let i = 0; i < 2; i++) {
      const { processorVersionId } = await createProcessorVersion(
        `T03.14-${Date.now()}-${i}`,
        need,
      );
      taskIds.push(await createAndTriggerTask(cookie, processorVersionId, `T03.14 – task ${i}`));
    }
    expect(taskIds.length).toBe(2);
    log.ok('two node-sized tasks queued');
  }, 120_000);

  // @plan T03.14
  // @covers EOCP-E3-07
  it('Step 2 – the scheduler accounts for the load it has already committed', async () => {
    log.step('Step 2 — wait for both placements');

    const allocs = await waitForAllocations(taskIds, (as) => as.length >= 2, 180_000);
    expect(allocs.length).toBeGreaterThanOrEqual(2);
    for (const a of allocs) expect(a.reservedCpu).toBe(need.cores);
    log.ok(`placements: ${JSON.stringify(allocs.map((a) => a.hostId))}`);
  }, 240_000);

  // @plan T03.14
  // @covers EOCP-E3-07
  it('Step 3 – the saturated node is excluded from the second placement', async () => {
    log.step('Step 3 — the two tasks must sit on different nodes');

    const allocs = await waitForAllocations(taskIds, (as) => as.length >= 2, 60_000);
    const distinct = new Set(allocs.map((a) => a.hostId));

    // Each node holds exactly one of these tasks, so a repeat placement would
    // mean the scheduler ignored the capacity it had already reserved.
    expect(distinct.size).toBe(2);
    expect([...distinct].sort()).toEqual([firstHostId, secondHostId].sort());
    log.ok('the saturated node was excluded; the second task went elsewhere');
  }, 120_000);
});
