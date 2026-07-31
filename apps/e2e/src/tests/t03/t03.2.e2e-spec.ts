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

// @plan T03.2 — Automatic node selection based on resource availability
// @covers EOCP-E3-02
//
// Description: This test validates that the scheduler automatically selects execution nodes based
//   on realtime availability and compatibility with task requirements.
// Prerequisites: Multiple execution nodes with heterogeneous capacities are registered. Dynamic
//   resource reporting is enabled.
// Steps:
//   1. Register nodes with different CPU and RAM → Node capabilities are visible
//   2. Submit a resourceconstrained task → Scheduler evaluates all nodes
//   3. Observe node assignment → Only compatible node is selected
//   4. Verify scheduler logs → Decision is justified by resources

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.2');

describe('T03.2 — Automatic node selection based on resource availability', () => {
  let cookie: string;
  let dataCenterCode: string;
  let smallHostId: number;
  let largeHostId: number;
  let taskId: number;
  let need: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;

  const smallHostname = uniqueHostname('t03-2-small');
  const largeHostname = uniqueHostname('t03-2-large');

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling([smallHostname, largeHostname]);
    need = { cores: ceiling.cores + 4, ram: ceiling.ram + 8_000_000_000n };
    log.ok(`ambient ceiling ${ceiling.cores}c/${ceiling.ram}B → need ${need.cores}c/${need.ram}B`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks([taskId].filter(Boolean));
    if (taskId) await request(API).delete(`/task/${taskId}`).set('Cookie', cookie);
    await deleteHost(smallHostname);
    await deleteHost(largeHostname);
  });

  // @plan T03.2
  // @covers EOCP-E3-02
  it('Step 1 – nodes with different CPU and RAM register and expose their capabilities', async () => {
    log.step('Step 1 — register one node below and one above the requirement');

    const small = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(smallHostname, dataCenterCode),
        nbCores: need.cores - 2,
        ram: Number(need.ram - 4_000_000_000n),
      });
    log.http('POST', '/host/register (small)', small.status, { id: small.body.data?.id });
    expect(small.status).toBe(200);
    smallHostId = small.body.data.id;

    const large = await request(API)
      .post('/host/register')
      .set(workerHeader())
      .send({
        ...registerPayload(largeHostname, dataCenterCode),
        nbCores: need.cores * 2,
        ram: Number(need.ram * 2n),
      });
    log.http('POST', '/host/register (large)', large.status, { id: large.body.data?.id });
    expect(large.status).toBe(200);
    largeHostId = large.body.data.id;

    const readback = await request(API).get(`/host/${smallHostId}`).set('Cookie', cookie);
    expect(readback.status).toBe(200);
    expect(readback.body.data.nbCores).toBe(need.cores - 2);

    // No worker process backs these hosts, so nothing else keeps them Up.
    stopHeartbeats = keepHostsAlive([smallHostId, largeHostId]);
    log.ok(`small=${smallHostId} (${need.cores - 2}c), large=${largeHostId} (${need.cores * 2}c)`);
  });

  // @plan T03.2
  // @covers EOCP-E3-02
  it('Step 2 – a resource-constrained task is submitted for scheduling', async () => {
    log.step(`Step 2 — submit a task needing ${need.cores} cores`);

    const { processorVersionId } = await createProcessorVersion(`T03.2-${Date.now()}`, need);
    taskId = await createAndTriggerTask(cookie, processorVersionId, 'T03.2 – resource-constrained');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    log.ok(`scheduler evaluated the fleet and placed ${allocs.length} job(s)`);
  }, 180_000);

  // @plan T03.2
  // @covers EOCP-E3-02
  it('Step 3 – only the compatible node is selected', async () => {
    log.step('Step 3 — check which node was chosen');

    const allocs = await waitForAllocations([taskId], (as) => as.length > 0, 60_000);
    log.ok(`placement: ${JSON.stringify(allocs)}`);

    for (const alloc of allocs) {
      expect(alloc.hostId).toBe(largeHostId);
      expect(alloc.hostId).not.toBe(smallHostId);
      expect(alloc.reservedCpu).toBe(need.cores);
      expect(BigInt(alloc.reservedRam)).toBe(need.ram);
    }
    log.ok(`every job was placed on the large node (${largeHostId})`);
  }, 120_000);

  // @plan T03.2
  // @covers EOCP-E3-02
  it('Step 4 – the decision is justified by the advertised resources', async () => {
    log.step('Step 4 — re-read both nodes and confirm the filter outcome');

    const [small, large] = await Promise.all([
      request(API).get(`/host/${smallHostId}`).set('Cookie', cookie),
      request(API).get(`/host/${largeHostId}`).set('Cookie', cookie),
    ]);
    expect(small.status).toBe(200);
    expect(large.status).toBe(200);

    expect(large.body.data.nbCores).toBeGreaterThanOrEqual(need.cores);
    expect(BigInt(large.body.data.ram)).toBeGreaterThanOrEqual(need.ram);
    expect(small.body.data.nbCores).toBeLessThan(need.cores);
    expect(BigInt(small.body.data.ram)).toBeLessThan(need.ram);

    log.ok(
      `need ${need.cores}c/${need.ram}B — large offers ${large.body.data.nbCores}c/` +
        `${large.body.data.ram}B, small only ${small.body.data.nbCores}c/${small.body.data.ram}B`,
    );
  });
});
