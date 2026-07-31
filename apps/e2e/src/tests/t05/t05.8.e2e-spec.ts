import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.8 — Identification of conflicting nodes in dependency errors
// @covers EOCP-E5-02
//
// Description: Verifies that cycle-closing edge attempts are rejected with structured error
//   responses, and that a corrected (non-cycle) edge is accepted.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.8');

describe('T05.8 — Identification of conflicting nodes in dependency errors', () => {
  let cookie: string;
  let chainId: string;

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
      .send({ name: `T05.8-conflict-${Date.now()}`, kind: 'Standard', comment: 'T05.8 conflicting nodes' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    for (const name of ['T05.8-node-A', 'T05.8-node-B']) {
      log.action(`POST processing-chain ${name}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name });
      log.http('POST', `processing-chains (${name})`, pc.status);
      expect(pc.status).toBe(201);
    }

    log.action('GET chain to resolve IDs');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-A')?.id;
    const stepBId = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-B')?.id;
    expect(stepAId).toBeDefined();
    expect(stepBId).toBeDefined();

    log.action('POST edges A→B (base)');
    const edge = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (A→B)', edge.status, edge.status === 201 ? { id: edge.body.data?.id } : edge.body);
    expect(edge.status).toBe(201);
    log.ok(`A→B edge created; stepA=${stepAId}, stepB=${stepBId}`);
  });

  afterAll(async () => {
    if (chainId) {
      log.action(`afterAll — deleting chain ${chainId}`);
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T05.8
  // @covers EOCP-E5-02
  it('Step 1 – cycle-closing edge B→A is rejected with 4xx and error message mentioning cycle', async () => {
    log.step('Step 1 — POST edges B→A (cycle)');

    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-B');
    expect(pcA).toBeDefined();
    expect(pcB).toBeDefined();

    log.action('POST edges B→A (cycle)', { parentChainId: pcB.id, childChainId: pcA.id });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB.id, childChainId: pcA.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (B→A cycle)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    const body = res.body as Record<string, unknown>;
    const message = ((body.error as { message?: string } | undefined)?.message ?? (body.message as string | undefined) ?? '');
    log.ok(`cycle rejected (${res.status}): "${message}"`);
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
    expect(message.toLowerCase()).toMatch(/cycle/);
    log.ok('error message contains "cycle"');
  });

  // @plan T05.8
  // @covers EOCP-E5-02
  it('Step 2 – error body is structured (statusCode + message, no raw stack trace)', async () => {
    log.step('Step 2 — POST edges B→A (validate error body shape)');

    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcA = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-A');
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-B');

    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB.id, childChainId: pcA.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (cycle, body)', res.status, res.body);

    const body = res.body as { error?: { message?: unknown } };
    log.ok(`body keys: ${Object.keys(res.body as object).join(', ')}`);

    // Structured error shape: { error: { code | statusCode, message } }
    expect(body.error).toBeDefined();
    expect(body.error?.message).toBeDefined();
    expect(typeof body.error?.message).toBe('string');

    // No raw stack trace must leak into the response
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok('structured error body confirmed, no stack trace');
  });

  // @plan T05.8
  // @covers EOCP-E5-02
  it('Step 3 – corrected configuration (non-cycle edge B→C) is accepted with correct response shape', async () => {
    log.step('Step 3 — add C node and POST edges B→C (valid non-cycle)');

    log.action('POST processing-chain node-C');
    const addC = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T05.8-node-C' });
    log.http('POST', 'processing-chains (node-C)', addC.status);
    expect(addC.status).toBe(201);

    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    log.http('GET', `/production-chain/${chainId}`, chainRes.status);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const pcB = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-B');
    const pcC = pcs.find((pc: { name: string }) => pc.name === 'T05.8-node-C');
    expect(pcB).toBeDefined();
    expect(pcC).toBeDefined();

    log.action('POST edges B→C (valid non-cycle)', { parentChainId: pcB.id, childChainId: pcC.id });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: pcB.id, childChainId: pcC.id, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (B→C valid)', res.status, res.status < 300 ? { id: res.body.data?.id, dependencyMode: res.body.data?.dependencyMode, parentChainId: res.body.data?.parentChainId, childChainId: res.body.data?.childChainId } : res.body);
    expect(res.status).toBe(201);

    const data = res.body.data;
    expect(data.id).toBeDefined();
    expect(data.dependencyMode).toBe('OnSuccess');
    expect(data.parentChainId).toBe(pcB.id);
    expect(data.childChainId).toBe(pcC.id);
    log.ok(`valid B→C edge accepted: id=${data.id}, parent=${data.parentChainId}, child=${data.childChainId}`);
  });
});
