import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.4 — Detection and rejection of circular dependencies
// @covers EOCP-E5-02
//
// Description: Verifies that adding an edge that would create a cycle is rejected with a 4xx
//   response, and that a self-edge is also rejected.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.4');

describe('T05.4 — Detection and rejection of circular dependencies', () => {
  let cookie: string;
  let chainId: string;
  let stepAId: string;
  let stepBId: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');

    log.action('POST /production-chain');
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.4-cycle-${Date.now()}`, kind: 'Standard', comment: 'T05.4 cycle detection' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.4-step-A', 'T05.4-step-B']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }

    log.action('GET chain to resolve processing-chain IDs');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-A')?.id;
    stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-B')?.id;
    log.ok(`stepA=${stepAId}, stepB=${stepBId}`);

    log.action('POST edges A→B (valid first direction)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→B)', edge.status, edge.status === 201 ? { id: edge.body.data?.id } : edge.body);
    expect(edge.status).toBe(201);
    log.ok('A→B edge created');
  });

  afterAll(async () => {
    if (chainId) {
      log.action(`afterAll — deleting chain ${chainId}`);
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T05.4
  // @covers EOCP-E5-02
  it('Step 1 – attempting to add B → A (closing cycle A → B → A) is rejected', async () => {
    log.step('Step 1 — POST edges B→A (would close cycle)');

    // Re-fetch IDs from latest version after the A→B edge was created
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-B');

    log.action('POST edges B→A', { parentChainId: pcB?.id, childChainId: pcA?.id });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB?.id, childChainId: pcA?.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (B→A cycle)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`cycle B→A rejected (${res.status})`);
  });

  // @plan T05.4
  // @covers EOCP-E5-02
  it('Step 2 – self-edge (A → A) is also rejected as a degenerate cycle', async () => {
    log.step('Step 2 — POST edges A→A (self-cycle)');

    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-A');

    log.action('POST edges A→A', { parentChainId: pcA?.id, childChainId: pcA?.id });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcA?.id, childChainId: pcA?.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→A self)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`self-edge rejected (${res.status})`);
  });

  // @plan T05.4
  // @covers EOCP-E5-02
  it('Step 3 – cycle rejection error response identifies the problem clearly (no stack trace)', async () => {
    log.step('Step 3 — POST edges B→A (error body check)');

    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.4-step-B');

    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB?.id, childChainId: pcA?.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (cycle, body check)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = res.body as Record<string, unknown>;
    const hasErrorField =
      body.message !== undefined || body.error !== undefined ||
      body.errors !== undefined || body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok('structured error, no stack trace');
  });
});
