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

// @plan T03.11 — Handling of heterogeneous node architectures
// @covers EOCP-E3-02
//
// Description: This test validates scheduler behavior when nodes have different architectures or
//   execution environments.
// Prerequisites: Nodes with different runtimes are registered.
// Steps:
//   1. Register heterogeneous nodes → Differences are recorded
//   2. Submit architecturedependent task → Scheduler evaluates constraints
//   3. Observe node selection → Only matching architecture is used

// Requirements are sized above whatever the ambient e2e worker advertises: the
// API sets a host back to Up on every heartbeat, so that worker cannot be held
// out of scheduling for the length of a test — only a requirement it cannot
// satisfy keeps it out of the placements under test.

const log = makeLogger('T03.11');

describe('T03.11 — Handling of heterogeneous node architectures', () => {
  let cookie: string;
  let dataCenterCode: string;
  let dockerId: number;
  let apptainerId: number;
  let kubernetesId: number;
  let need: { cores: number; ram: bigint };
  let apptainerTaskId: number;
  let dockerTaskId: number;
  let stopHeartbeats: (() => void) | undefined;

  const dockerHost = uniqueHostname('t03-11-docker');
  const apptainerHost = uniqueHostname('t03-11-apptainer');
  const kubernetesHost = uniqueHostname('t03-11-k8s');
  const mine = [dockerHost, apptainerHost, kubernetesHost];

  beforeAll(async () => {
    log.step('beforeAll — registering nodes with three different runtimes');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    dataCenterCode = await resolveDataCenterCode();

    const ceiling = await ambientCeiling(mine);
    need = { cores: ceiling.cores + 2, ram: ceiling.ram + 2_000_000_000n };

    const specs = [
      { name: dockerHost, runtime: 'Docker' },
      { name: apptainerHost, runtime: 'Apptainer' },
      { name: kubernetesHost, runtime: 'Kubernetes' },
    ];
    const ids: number[] = [];
    for (const s of specs) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send({
          ...registerPayload(s.name, dataCenterCode),
          nbCores: need.cores * 4,
          ram: Number(need.ram * 4n),
          containerRuntime: s.runtime,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.containerRuntime).toBe(s.runtime);
      ids.push(res.body.data.id);
    }
    [dockerId, apptainerId, kubernetesId] = ids;
    stopHeartbeats = keepHostsAlive(ids);
    log.ok(`docker=${dockerId}, apptainer=${apptainerId}, kubernetes=${kubernetesId}`);
  });

  afterAll(async () => {
    stopHeartbeats?.();
    // Hand this spec's queue back before the next one registers its nodes.
    await releaseTasks([apptainerTaskId, dockerTaskId].filter(Boolean));
    for (const id of [apptainerTaskId, dockerTaskId]) {
      if (id) await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    for (const h of mine) await deleteHost(h);
  });

  // @plan T03.11
  // @covers EOCP-E3-02
  it('Step 1 – heterogeneous nodes register and their differences are recorded', async () => {
    log.step('Step 1 — read the three runtimes back');

    const res = await request(API).get('/host').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const byId = new Map<number, string>(
      (res.body.data as Array<{ id: number; containerRuntime: string }>).map((h) => [
        h.id,
        h.containerRuntime,
      ]),
    );

    expect(byId.get(dockerId)).toBe('Docker');
    expect(byId.get(apptainerId)).toBe('Apptainer');
    expect(byId.get(kubernetesId)).toBe('Kubernetes');
    log.ok('the three runtimes are recorded distinctly');
  });

  // @plan T03.11
  // @covers EOCP-E3-02
  it('Step 2 – an Apptainer task is constrained to the Apptainer node', async () => {
    log.step('Step 2 — submit a task requiring the Apptainer runtime');

    const { processorVersionId } = await createProcessorVersion(
      `T03.11-apptainer-${Date.now()}`,
      { ...need, runtime: 'Apptainer' },
    );
    apptainerTaskId = await createAndTriggerTask(
      cookie,
      processorVersionId,
      'T03.11 – apptainer task',
    );

    const allocs = await waitForAllocations([apptainerTaskId], (as) => as.length > 0, 120_000);
    for (const a of allocs) expect(a.hostId).toBe(apptainerId);
    log.ok(`apptainer task placed on ${apptainerId} only`);
  }, 180_000);

  // @plan T03.11
  // @covers EOCP-E3-02
  it('Step 3 – a Docker task never lands on the Apptainer node', async () => {
    log.step('Step 3 — Kubernetes may serve an OCI workload, Apptainer may not');

    const { processorVersionId } = await createProcessorVersion(`T03.11-docker-${Date.now()}`, {
      ...need,
      runtime: 'Docker',
    });
    dockerTaskId = await createAndTriggerTask(cookie, processorVersionId, 'T03.11 – docker task');

    const allocs = await waitForAllocations([dockerTaskId], (as) => as.length > 0, 120_000);
    expect(allocs.length).toBeGreaterThan(0);
    for (const a of allocs) {
      expect([dockerId, kubernetesId]).toContain(a.hostId);
      expect(a.hostId).not.toBe(apptainerId);
    }
    log.ok('docker task restricted to Docker/Kubernetes nodes');
  }, 180_000);
});
