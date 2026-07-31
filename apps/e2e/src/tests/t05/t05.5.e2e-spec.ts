import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T05.5 — Support for multiple dependency types
// @covers EOCP-E5-04
//
// Description: Verifies that OnSuccess, OnFailure, and OnDataAvailable dependency modes are all
//   accepted and stored correctly.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T05.5');

describe('T05.5 — Support for multiple dependency types', () => {
  let cookie: string;
  let chainIdSuccess: string;
  let chainIdFailure: string;
  let chainIdData: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of [chainIdSuccess, chainIdFailure, chainIdData]) {
      if (id) await request(API).delete(`/production-chain/${id}`).set('Cookie', cookie);
    }
    log.ok('afterAll cleanup done');
  });

  async function makeChainWithTwoSteps(suffix: string): Promise<{ chainId: string; stepAId: string; stepBId: string }> {
    const ts = Date.now();
    log.action(`POST /production-chain (${suffix})`);
    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T05.5-${suffix}-${ts}`, kind: 'Standard' });
    log.http('POST', `/production-chain (${suffix})`, chain.status, chain.status === 201 ? { id: chain.body.data.id } : chain.body);
    expect(chain.status).toBe(201);
    const chainId = chain.body.data.id as string;

    for (const step of ['A', 'B']) {
      log.action(`POST processing-chain ${suffix}-${step}`);
      const pc = await request(API)
        .post(`/production-chain/${chainId}/processing-chains`)
        .set('Cookie', cookie)
        .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: `T05.5-${suffix}-${step}` });
      log.http('POST', `processing-chains (${suffix}-${step})`, pc.status);
      expect(pc.status).toBe(201);
    }

    log.action(`GET chain ${suffix} to resolve IDs`);
    const chainRes = await request(API).get(`/production-chain/${chainId}`).set('Cookie', cookie);
    expect(chainRes.status).toBe(200);
    const pcs = chainRes.body.data.processingChains ?? [];
    const stepAId = pcs.find((pc: { name: string }) => pc.name === `T05.5-${suffix}-A`)?.id as string;
    const stepBId = pcs.find((pc: { name: string }) => pc.name === `T05.5-${suffix}-B`)?.id as string;
    return { chainId, stepAId, stepBId };
  }

  // @plan T05.5
  // @covers EOCP-E5-04
  it('Step 1 – OnSuccess dependency is accepted and stored', async () => {
    log.step('Step 1 — POST edges (OnSuccess)');

    const { chainId, stepAId, stepBId } = await makeChainWithTwoSteps('success');
    chainIdSuccess = chainId;

    log.action('POST edges (OnSuccess)', { parentChainId: stepAId, childChainId: stepBId });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnSuccess' });
    log.http('POST', 'edges (OnSuccess)', res.status, res.status < 300 ? { dependencyMode: res.body.data?.dependencyMode } : res.body);
    expect([201, 200]).toContain(res.status);
    expect(res.body.data.dependencyMode).toBe('OnSuccess');
    log.ok('OnSuccess stored');
  });

  // @plan T05.5
  // @covers EOCP-E5-04
  it('Step 2 – OnFailure dependency is accepted and stored', async () => {
    log.step('Step 2 — POST edges (OnFailure)');

    const { chainId, stepAId, stepBId } = await makeChainWithTwoSteps('failure');
    chainIdFailure = chainId;

    log.action('POST edges (OnFailure)', { parentChainId: stepAId, childChainId: stepBId });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnFailure' });
    log.http('POST', 'edges (OnFailure)', res.status, res.status < 300 ? { dependencyMode: res.body.data?.dependencyMode } : res.body);
    expect([201, 200]).toContain(res.status);
    expect(res.body.data.dependencyMode).toBe('OnFailure');
    log.ok('OnFailure stored');
  });

  // @plan T05.5
  // @covers EOCP-E5-04
  it('Step 3 – OnDataAvailable dependency is accepted and stored', async () => {
    log.step('Step 3 — POST edges (OnDataAvailable)');

    const { chainId, stepAId, stepBId } = await makeChainWithTwoSteps('data');
    chainIdData = chainId;

    log.action('POST edges (OnDataAvailable)', { parentChainId: stepAId, childChainId: stepBId });
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', cookie)
      .send({ parentChainId: stepAId, childChainId: stepBId, dependencyMode: 'OnDataAvailable' });
    log.http('POST', 'edges (OnDataAvailable)', res.status, res.status < 300 ? { dependencyMode: res.body.data?.dependencyMode } : res.body);
    expect([201, 200]).toContain(res.status);
    expect(res.body.data.dependencyMode).toBe('OnDataAvailable');
    log.ok('OnDataAvailable stored');
  });
});
