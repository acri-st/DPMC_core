import request from 'supertest';
import { CONFIG } from '../../constants/config';
import { API } from '../../support/auth';

// @plan T12.1 — User authentication enforcement.
// Verifies that public endpoints stay reachable without auth, that protected
// endpoints reject unauthenticated requests, and that the worker shared
// secret on /host/register is enforced. Section T12 — Security.
//
// NOTE: bearer-token authentication is no longer supported for app routes;
// the API now relies on session cookies set by the OAuth callback. The
// "valid bearer" path is therefore covered by integration tests once a
// session-cookie helper is added.

const WORKER_HEADER = CONFIG.worker.headerName;

describe('T12.1 — User authentication enforcement', () => {
  // @plan T12.1
  // @covers EOCP-E12-01
  it('public endpoints are reachable without a session', async () => {
    await request(API).get('/status').expect(200);
  });

  // @plan T12.1
  // @covers EOCP-E12-01
  it('protected endpoints reject unauthenticated requests with 401', async () => {
    await request(API).get('/task').expect(401);
    await request(API).get('/batch').expect(401);
    await request(API).get('/production-chain').expect(401);
  });

  // @plan T12.1
  // @covers EOCP-E12-01
  it('worker endpoint rejects requests without the shared-secret header', async () => {
    await request(API)
      .post('/host/register')
      .send({ hostname: 'unauth' })
      .expect(401);
  });

  // @plan T12.1
  // @covers EOCP-E12-01
  it('worker endpoint rejects a wrong shared secret', async () => {
    await request(API)
      .post('/host/register')
      .set({ [WORKER_HEADER]: 'wrong' })
      .send({ hostname: 'wrong-secret' })
      .expect(401);
  });
});
