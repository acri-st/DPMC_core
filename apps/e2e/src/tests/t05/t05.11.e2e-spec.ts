import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.11 — Detection of missing dependency references
// @covers EOCP-E5-03
//
// Description: Verifies that edges referencing non-existent processing chains are rejected with
//   structured error responses.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.11');

describe('T05.11 — Detection of missing dependency references', () => {
  let cookie: string;
  let chainId: string;
  let stepAId: string;
  const nonExistentId = '00000000-0000-0000-0000-000000000000';

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
      .send({ name: `T05.11-missing-ref-${Date.now()}`, kind: 'Standard', comment: 'T05.11 missing ref' });
    log.http('POST', '/production-chain', chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    log.action('POST processing-chain step-A');
    const pc = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', cookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T05.11-step-A' });
    log.http('POST', 'processing-chains (step-A)', pc.status);
    expect(pc.status).toBe(201);

    log.action('GET chain to resolve stepA ID');
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.latestVersion?.processingChains ?? [];
    stepAId = pcs.find((pc: { name: string }) => pc.name === 'T05.11-step-A')?.id;
    log.ok(`stepA=${stepAId}`);
  });

  afterAll(async () => {
    if (chainId) {
      log.action(`afterAll — deleting chain ${chainId}`);
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
      log.ok('chain deleted');
    }
  });

  // @plan T05.11
  // @covers EOCP-E5-03
  it('Step 1 – edge referencing a non-existent child processing chain is rejected', async () => {
    log.step('Step 1 — POST edges (valid parent, non-existent child)');

    log.action('POST edges', { parentChainId: stepAId, childChainId: nonExistentId });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: nonExistentId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (bad child)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`non-existent child rejected (${res.status})`);
  });

  // @plan T05.11
  // @covers EOCP-E5-03
  it('Step 2 – edge referencing a non-existent parent processing chain is rejected', async () => {
    log.step('Step 2 — POST edges (non-existent parent, valid child)');

    log.action('POST edges', { parentChainId: nonExistentId, childChainId: stepAId });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: nonExistentId, childChainId: stepAId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (bad parent)', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`non-existent parent rejected (${res.status})`);
  });

  // @plan T05.11
  // @covers EOCP-E5-03
  it('Step 3 – error response for missing reference is structured (no stack trace)', async () => {
    log.step('Step 3 — POST edges (bad child, body check)');

    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: nonExistentId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (body check)', res.status, res.body);

    const body = res.body as Record<string, unknown>;
    const hasErrorField =
      body.message !== undefined || body.error !== undefined ||
      body.errors !== undefined || body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok('error body structured, no stack trace');
  });
});
