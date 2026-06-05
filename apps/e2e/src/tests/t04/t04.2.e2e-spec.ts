import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T04.2 — Backward compatibility for simple jobs without chains
// @covers EOCP-E4-02
//
// Description: Verifies that simple standalone jobs can still be executed without a production
//   chain, preserving legacy behavior.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T04.2');

describe('T04.2 — Backward compatibility for simple jobs without chains', () => {
  let cookie: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T04.2
  // @covers EOCP-E4-02
  it('Step 1 – standalone task (no chain) is accepted with 201', async () => {
    log.step('Step 1 — POST /task (kind=Standalone, no chain)');

    const payload = {
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T04.2 – standalone backward compat',
    };
    log.action('POST /task', { kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID });

    const res = await request(API).post('/task').set('Cookie', cookie).send(payload);
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id } : res.body);
    expect(res.status).toBe(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.id).toBeDefined();
    log.ok(`standalone task created: ${res.body.data.id}`);
  });

  // @plan T04.2
  // @covers EOCP-E4-02
  it('Step 2 – standalone task has a valid scheduled status', async () => {
    log.step(`Step 2 — GET /task/${createdTaskIds[0]}`);

    const res = await request(API).get(`/task/${createdTaskIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/task/${createdTaskIds[0]}`, res.status, { status: res.body.data?.status, scheduledStartTime: res.body.data?.scheduledStartTime });
    expect(res.status).toBe(200);

    const validStatuses = ['Edited', 'Queued', 'Running', 'Done', 'Error', 'Suspended'];
    expect(validStatuses).toContain(res.body.data.status);
    expect(res.body.data.scheduledStartTime).toBeDefined();
    log.ok(`task status: ${res.body.data.status}`);
  });

  // @plan T04.2
  // @covers EOCP-E4-02
  it('Step 3 – standalone task has no productionChainId (no chain logic applied)', async () => {
    log.step(`Step 3 — GET /task/${createdTaskIds[0]} (chain check)`);

    const res = await request(API).get(`/task/${createdTaskIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/task/${createdTaskIds[0]}`, res.status, { productionChainId: res.body.data?.productionChainId, kind: res.body.data?.kind });
    expect(res.status).toBe(200);
    expect(res.body.data.productionChainId).toBeNull();
    expect(res.body.data.kind).toBe('Standalone');
    log.ok('no productionChainId — standalone confirmed');
  });
});
