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

// @plan T03.9 — Stress testing scheduler with heterogeneous resource profiles
// @covers EOCP-E3-01, EOCP-E3-02
//
// Description: This test evaluates scheduler behavior under load with tasks requiring very different
//   resource profiles.
// Prerequisites: Nodes with heterogeneous resources are registered.
// Steps:
//   1. Submit many heterogeneous tasks → Scheduler remains responsive
//   2. Observe dispatch distribution → Resources are used optimally
//   3. Monitor system metrics → No starvation or deadlock detected

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.9');

// Node and task sizes as multiples of one unit derived from the ambient
// ceiling: the small nodes can only take a light task, so a scheduler that does
// not look at capacity starves the heavy ones.
const NODE_UNITS = [8, 8, 4, 1, 1];
const TASK_UNITS = [1, 1, 4, 1, 2, 1];

describe('T03.9 — Stress testing scheduler with heterogeneous resource profiles', () => {
  let cookie: string;
  let dataCenterCode: string;
  let unit: { cores: number; ram: bigint };
  let stopHeartbeats: (() => void) | undefined;
  const hostIds: number[] = [];
  const hostnames = NODE_UNITS.map((u, i) => uniqueHostname(`t03-9-n${i}-u${u}`));
  const taskIds: number[] = [];

  beforeAll(async () => {
    log.step('beforeAll — registering a heterogeneous fleet');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling(hostnames);
    unit = { cores: ceiling.cores + 2, ram: ceiling.ram + 1_000_000_000n };

    for (const [i, units] of NODE_UNITS.entries()) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(hostnames[i], dataCenterCode),
          nbCores: unit.cores * units,
          ram: Number(unit.ram * BigInt(units)),
          disk: 500_000_000_000,
        });
      expect(res.status).toBe(200);
      hostIds.push(res.body.data.id);
    }
    stopHeartbeats = keepHostsAlive(hostIds);
    log.ok(`fleet sizes (units): ${NODE_UNITS.join(', ')} — unit = ${unit.cores} cores`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks(taskIds);
    for (const id of taskIds) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    for (const h of hostnames) await deleteHost(h);
  });

  // @plan T03.9
  // @covers EOCP-E3-01, EOCP-E3-02
  it('Step 1 – the scheduler stays responsive while heterogeneous tasks arrive', async () => {
    log.step(`Step 1 — submit ${TASK_UNITS.length} tasks with different profiles`);

    for (const [i, units] of TASK_UNITS.entries()) {
      const { processorVersionId } = await createProcessorVersion(`T03.9-${Date.now()}-${i}`, {
        cores: unit.cores * units,
        ram: unit.ram * BigInt(units),
      });
      taskIds.push(
        await createAndTriggerTask(cookie, processorVersionId, `T03.9 – ${units} unit(s)`),
      );
    }

    const started = Date.now();
    const res = await request(API).get('/status');
    const elapsed = Date.now() - started;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(5_000);
    log.ok(`${TASK_UNITS.length} tasks queued; /status answered in ${elapsed}ms`);
  }, 240_000);

  // @plan T03.9
  // @covers EOCP-E3-01, EOCP-E3-02
  it('Step 2 – every placement fits within the node it landed on', async () => {
    log.step('Step 2 — check each placement against node capacity');

    const allocs = await waitForAllocations(
      taskIds,
      (as) => as.length >= TASK_UNITS.length,
      240_000,
    );
    log.ok(`placements: ${JSON.stringify(allocs.map((a) => ({ h: a.hostId, c: a.reservedCpu })))}`);

    const hosts = await request(API).get('/host').set('Cookie', cookie);
    expect(hosts.status).toBe(200);
    const byId = new Map<number, { nbCores: number; ram: string }>(
      (hosts.body.data as Array<{ id: number; nbCores: number; ram: string }>).map((h) => [h.id, h]),
    );

    for (const alloc of allocs) {
      const host = byId.get(alloc.hostId);
      expect(host).toBeDefined();
      // A placement exceeding its node would be a compatibility-filter bug.
      expect(host!.nbCores).toBeGreaterThanOrEqual(alloc.reservedCpu);
      expect(BigInt(host!.ram)).toBeGreaterThanOrEqual(BigInt(alloc.reservedRam));
    }
    log.ok('every placement fits within its node capacity');
  }, 300_000);

  // @plan T03.9
  // @covers EOCP-E3-01, EOCP-E3-02
  it('Step 3 – no profile is starved and the scheduler does not deadlock', async () => {
    log.step('Step 3 — the heaviest profile must be served too');

    const allocs = await waitForAllocations(
      taskIds,
      (as) => as.length >= TASK_UNITS.length,
      120_000,
    );

    // The largest profile is the one a starving scheduler would leave behind.
    const heaviest = unit.cores * Math.max(...TASK_UNITS);
    expect(allocs.filter((a) => a.reservedCpu === heaviest).length).toBeGreaterThan(0);
    log.ok(`the ${heaviest}-core profile was placed`);

    const status = await request(API).get('/status');
    expect(status.status).toBe(200);
    const entry = (status.body.data?.services ?? []).find(
      (s: { name: string }) => s.name === 'dispatcher',
    );
    expect(entry?.status).toBe('OK');
    log.ok('dispatcher healthy after the burst — no deadlock');
  }, 180_000);
});
