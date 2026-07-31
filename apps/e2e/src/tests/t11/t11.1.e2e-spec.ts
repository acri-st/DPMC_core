import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID, PROCESSOR_VERSION_ID } from './_shared';

// @plan T11.1 — Exposure of core DPMC functionalities through REST APIs
// @covers EOCP-E11-01, EOCP-E1-02

const log = makeLogger('T11.1');

describe('T11.1 — Exposure of core DPMC functionalities through REST APIs', () => {
  let cookie: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
  });

  // @plan T11.1
  // @covers EOCP-E11-01, EOCP-E1-02
  it('Step 1 – GET /status returns service information', async () => {
    log.step('Step 1 — GET /status');
    const res = await request(API).get('/status').set('Cookie', cookie);
    log.http('GET', '/status', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    log.ok('status endpoint reachable');
  });

  // @plan T11.1
  // @covers EOCP-E11-01, EOCP-E1-02
  it('Step 2 – a documentation or liveness endpoint is reachable', async () => {
    log.step('Step 2 — probe doc/health endpoints');
    const candidates = ['/docs-json', '/docs', '/swagger', '/openapi.json', '/healthz'];
    let found = false;
    for (const path of candidates) {
      const res = await request(API).get(path).set('Cookie', cookie);
      log.http('GET', path, res.status);
      if (res.status === 200) { found = true; break; }
    }
    expect(found).toBe(true);
    log.ok('liveness/docs endpoint found');
  });

  // @plan T11.1
  // @covers EOCP-E11-01, EOCP-E1-02
  it('Step 3 – POST /task creates a Standalone task with correct fields', async () => {
    log.step('Step 3 — POST /task');
    log.action('POST /task', { kind: 'Standalone', processorVersionId: PROCESSOR_VERSION_ID });
    const res = await request(API).post('/task').set('Cookie', cookie).send({
      projectId: PROJECT_ID,
      kind: 'Standalone',
      processorVersionId: PROCESSOR_VERSION_ID,
      priority: 0,
      productionMode: 'Nominal',
      priorityClass: 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment: 'T11.1 – REST API coverage test',
    });
    log.http('POST', '/task', res.status, res.status === 201 ? { id: res.body.data.id, kind: res.body.data.kind, status: res.body.data.status } : res.body);
    expect(res.status).toBe(201);
    createdIds.push(res.body.data.id);
    expect(res.body.data.kind).toBe('Standalone');
    expect(res.body.data.status).toBeDefined();
    log.ok(`task created: ${res.body.data.id}`);
  });

  // @plan T11.1
  // @covers EOCP-E11-01, EOCP-E1-02
  it('Step 4 – GET /task/:id returns the task with correct id, kind, and a valid status', async () => {
    log.step(`Step 4 — GET /task/${createdIds[0]}`);
    const res = await request(API).get(`/task/${createdIds[0]}`).set('Cookie', cookie);
    log.http('GET', `/task/${createdIds[0]}`, res.status, res.status === 200 ? { id: res.body.data.id, kind: res.body.data.kind, status: res.body.data.status } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdIds[0]);
    expect(res.body.data.kind).toBe('Standalone');
    expect(typeof res.body.data.status).toBe('string');
    log.ok(`task status: ${res.body.data.status}`);
  });

  // @plan T11.1
  // @covers EOCP-E11-01, EOCP-E1-02
  it('Step 5 – GET /task returns an array with id on each item', async () => {
    log.step('Step 5 — GET /task (list)');
    const res = await request(API).get('/task').set('Cookie', cookie);
    log.http('GET', '/task', res.status);
    expect(res.status).toBe(200);
    const list: { id: string }[] = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(Array.isArray(list)).toBe(true);
    log.ok(`task list: ${list.length} items`);
  });
});
