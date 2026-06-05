import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T06.23 — Stability under rapid elasticity
// @covers EOCP-E6-10
//
// Description: This test verifies that rapid addition and removal of execution nodes does not
//   destabilize scheduling logic.
// Prerequisites: Elastic provisioning mechanism is enabled.
// Steps:
//   1. Rapidly add multiple execution nodes → Nodes register correctly
//   2. Rapidly remove nodes → Scheduler adapts safely
//   3. Observe scheduling decisions → No errors or deadlocks occur

const log = makeLogger('T06.23');

describe('T06.23 — Stability under rapid elasticity', () => {
  const BATCH_SIZE = 8;
  const hostnames = Array.from({ length: BATCH_SIZE }, (_, i) =>
    uniqueHostname(`t06-23-rapid-${i}`),
  );
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

  // @plan T06.23
  // @covers EOCP-E6-10
  it('Step 1 – 8 nodes register rapidly without error (rapid elastic add)', async () => {
    log.step('Step 1 — POST /host/register x8 (rapid add)');
    const results = await Promise.all(
      hostnames.map((hostname) =>
        request(API)
          .post('/host/register')
          .set(workerHeader())
          .send(registerPayload(hostname)),
      ),
    );
    for (const res of results) {
      log.http('POST', '/host/register', res.status, res.status === 200 ? { id: res.body.data.id } : res.body);
      expect(res.status).toBe(200);
      hostIds.push(res.body.data.id);
    }
    expect(hostIds.length).toBe(BATCH_SIZE);
    log.ok(`${BATCH_SIZE} nodes registered`);
  });

  // @plan T06.23
  // @covers EOCP-E6-10
  it('Step 2 – all 8 nodes are removed rapidly (set to Off) without error', async () => {
    log.step('Step 2 — PATCH /host/:id/status → Off x8 (rapid remove)');
    const results = await Promise.all(
      hostIds.map((id) =>
        request(API)
          .patch(`/host/${id}/status`)
          .set(workerHeader())
          .send({ status: 'Off' }),
      ),
    );
    for (const res of results) {
      log.http('PATCH', '/host/:id/status', res.status, res.status === 200 ? { status: res.body.data?.status } : res.body);
      expect(res.status).toBe(200);
    }
    log.ok('all 8 nodes set to Off');
  });

  // @plan T06.23
  // @covers EOCP-E6-10
  it('Step 3 – scheduler status endpoint responds normally after rapid elasticity cycle', async () => {
    log.step('Step 3 — GET /scheduler/status');
    const res = await request(API)
      .get('/scheduler/status');
    log.http('GET', '/scheduler/status', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    log.ok('scheduler stable after rapid elasticity cycle');
  });
});
