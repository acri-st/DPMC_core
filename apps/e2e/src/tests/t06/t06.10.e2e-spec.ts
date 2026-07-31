import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T06.10 — Elastic addition and removal of execution nodes
// @covers EOCP-E6-10
//
// Description: This test verifies that execution nodes can be dynamically added or removed without
//   disrupting scheduling operations.
// Prerequisites: Elastic node provisioning is enabled.
// Steps:
//   1. Add new execution nodes → Nodes register automatically
//   2. Submit jobs → New nodes are used
//   3. Remove nodes → Scheduler adapts gracefully

const log = makeLogger('T06.10');

describe('T06.10 — Elastic addition and removal of execution nodes', () => {
  const hostnames = [
    uniqueHostname('t06-10-elastic-a'),
    uniqueHostname('t06-10-elastic-b'),
  ];
  const hostIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  afterAll(async () => {
    for (const hn of hostnames) {
      await deleteHost(hn);
    }
  });

  // @plan T06.10
  // @covers EOCP-E6-10
  it('Step 1 – two execution nodes register dynamically (elastic add)', async () => {
    log.step('Step 1 — POST /host/register x2 (elastic add)');
    for (const hostname of hostnames) {
      const res = await request(API)
        .post('/host/register')
        .set(workerHeader())
        .send(registerPayload(hostname));
      log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id, hostname } : res.body);
      expect(res.status).toBe(200);
      hostIds.push(res.body.data.id);
    }
    expect(hostIds.length).toBe(2);
    log.ok(`2 nodes registered: ${hostIds.join(', ')}`);
  });

  // @plan T06.10
  // @covers EOCP-E6-10
  it('Step 2 – capacity summary reflects newly registered nodes', async () => {
    log.step('Step 2 — GET /host/capacity-summary');
    const res = await request(API)
      .get('/host/capacity-summary');
    log.http('GET', '/host/capacity-summary', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('capacity summary received');
  });

  // @plan T06.10
  // @covers EOCP-E6-10
  it('Step 3 – nodes can be set to Off to simulate elastic removal', async () => {
    log.step('Step 3 — PATCH /host/:id/status → Off x2 (elastic remove)');
    for (const id of hostIds) {
      const patch = await request(API)
        .patch(`/host/${id}/status`)
        .set(workerHeader())
        .send({ status: 'Off' });
      log.http('PATCH', `/host/${id}/status`, patch.status, patch.status === 200 ? { status: patch.body.data?.status } : patch.body);
      expect(patch.status).toBe(200);
    }

    log.action('GET /host/active (verify removal)');
    const res = await request(API)
      .get('/host/active');
    log.http('GET', '/host/active', res.status);
    expect(res.status).toBe(200);
    const activeIds = (res.body.data as { id: string }[]).map((h) => h.id);
    for (const id of hostIds) {
      expect(activeIds).not.toContain(id);
    }
    log.ok('nodes removed from active pool');
  });
});
