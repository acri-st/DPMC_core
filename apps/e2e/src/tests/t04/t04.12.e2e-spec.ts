import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession, asInternalViewerSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// Supplementary coverage — not a PLN.012 case. Kept because the DAG editor is
// the entry point the plan's T04.3/T04.4 exercise only through the API.
// @covers EOCP-E4-03

const log = makeLogger('T04.12');

describe('T04.12 — Production chain DAG editor backend', () => {
  let adminCookie: string;
  // viewerCookie is used by the permission-gating test (added in a later step of this suite).
  let viewerCookie: string;
  let chainId: string;
  let nodeAId: number;
  let nodeBId: number;

  beforeAll(async () => {
    await requireEnvReady();
    ({ cookie: adminCookie } = await asAdminSession());
    ({ cookie: viewerCookie } = await asInternalViewerSession());

    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', adminCookie)
      .send({ name: `T04.12-editor-${Date.now()}`, kind: 'Standard' });
    expect(chain.status).toBe(201);
    chainId = chain.body.data.id;

    const a = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', adminCookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.12-A' });
    expect(a.status).toBe(201);
    nodeAId = a.body.data.id;

    const b = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', adminCookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.12-B' });
    expect(b.status).toBe(201);
    nodeBId = b.body.data.id;
  });

  afterAll(async () => {
    if (chainId) {
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', adminCookie);
    }
  });

  // @covers EOCP-E4-03
  it('Step 1 – edge created with isFanOut=true persists and is returned', async () => {
    log.step('POST edge with isFanOut=true');
    const res = await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', adminCookie)
      .send({ parentChainId: nodeAId, childChainId: nodeBId, dependencyMode: 'OnSuccess', isFanOut: true });
    log.http('POST', 'edges (isFanOut)', res.status, res.body.data ?? res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.isFanOut).toBe(true);

    const get = await request(API).get(`/production-chain/${chainId}`).set('Cookie', adminCookie);
    const edge = (get.body.data.edges ?? []).find((e: { id: number }) => e.id === res.body.data.id);
    expect(edge?.isFanOut).toBe(true);
  });

  // @covers EOCP-E4-03
  it('Step 2 – duplicate node name in the same chain returns 409', async () => {
    log.step('POST processing-chain with an already-used name');
    const res = await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', adminCookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.12-A' });
    log.http('POST', 'processing-chains (dup name)', res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  // @covers EOCP-E4-03
  it('Step 3 – a viewer cannot add a node or an edge (403)', async () => {
    log.step('viewer POST node + edge → 403');
    await request(API)
      .post(`/production-chain/${chainId}/processing-chains`)
      .set('Cookie', viewerCookie)
      .send({ processingScriptId: PROCESSING_SCRIPT_ID, name: 'T04.12-viewer' })
      .expect(403);

    await request(API)
      .post(`/production-chain/${chainId}/edges`)
      .set('Cookie', viewerCookie)
      .send({ parentChainId: nodeBId, childChainId: nodeAId, dependencyMode: 'OnSuccess' })
      .expect(403);
  });
});
