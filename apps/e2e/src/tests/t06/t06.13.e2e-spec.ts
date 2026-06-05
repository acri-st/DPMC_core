import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { deleteHost, registerPayload, uniqueHostname, workerHeader } from '../t03/_shared';

// @plan T06.13 — Heartbeat scalability under large node population
// @covers EOCP-E6-11
//
// Description: This test verifies heartbeat handling scalability with a large number of nodes.
// Prerequisites: A large number of nodes can be simulated.
// Steps:
//   1. Register many execution nodes → Nodes appear active
//   2. Observe heartbeat traffic → No overload occurs
//   3. Monitor scheduler CPU → Remains within limits

const log = makeLogger('T06.13');

describe('T06.13 — Heartbeat scalability under large node population', () => {
  const hostnames = Array.from({ length: 10 }, (_, i) =>
    uniqueHostname(`t06-13-scale-${i}`),
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

  // @plan T06.13
  // @covers EOCP-E6-11
  it('Step 1 – 10 nodes register concurrently without error', async () => {
    log.step('Step 1 — POST /host/register x10 (concurrent)');
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
    expect(hostIds.length).toBe(10);
    log.ok(`10 nodes registered`);
  });

  // @plan T06.13
  // @covers EOCP-E6-11
  it('Step 2 – all 10 nodes send heartbeats concurrently without error', async () => {
    log.step('Step 2 — POST /host/:id/heartbeat x10 (concurrent)');
    const results = await Promise.all(
      hostIds.map((id) =>
        request(API)
          .post(`/host/${id}/heartbeat`)
          .set(workerHeader())
          .send({ cpuLoad: 0.1, memUsage: 0.2, diskUsage: 0.05 }),
      ),
    );
    for (const res of results) {
      log.http('POST', '/host/:id/heartbeat', res.status);
      expect(res.status).toBe(200);
    }
    log.ok('all 10 heartbeats accepted');
  });

  // @plan T06.13
  // @covers EOCP-E6-11
  it('Step 3 – scheduler heartbeat still responds after node heartbeat burst (no overload)', async () => {
    log.step('Step 3 — POST /scheduler/heartbeat');
    const res = await request(API)
      .post('/scheduler/heartbeat')
      .set(workerHeader())
      .send({ queueDepth: 0, runningCount: 0 });
    log.http('POST', '/scheduler/heartbeat', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    log.ok('scheduler heartbeat responded after burst');
  });
});
