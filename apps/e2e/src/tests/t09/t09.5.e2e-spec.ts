import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { makeTaskTable, uniqueName } from './_shared';

// @plan T09.5 — Bulk Task Table ingestion stress test
// @covers EOCP-E9-02
//
// Description: This test verifies system behavior when ingesting a large number of Task Tables or
//   very large tables.
// Prerequisites: Bulk ingestion is supported. Performance monitoring is enabled.
// Steps:
//   1. Submit multiple Task Tables in bulk → Ingestion starts
//   2. Monitor ingestion process → No crash or deadlock occurs
//   3. Verify resulting records → All valid tables are ingested

const log = makeLogger('T09.5');

const BULK_SIZE = 20;
// One oversized table alongside the batch: 200 tasks in a single document.
const LARGE_TASK_COUNT = 200;

describe('T09.5 — Bulk Task Table ingestion stress test', () => {
  let cookie: string;
  const batchPrefix = uniqueName('T09.5');
  const names = Array.from({ length: BULK_SIZE }, (_, i) => `${batchPrefix}-${i}`);
  const planIds: number[] = [];

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  // @plan T09.5
  // @covers EOCP-E9-02
  it('Step 1 – a bulk submission is accepted', async () => {
    log.step(`Step 1 — POST ${BULK_SIZE} Task Tables concurrently`);
    const started = Date.now();
    const results = await Promise.all(
      // ProcessingScript.acronym is unique, so each table carries its own.
      names.map((name, i) =>
        request(API)
          .post('/task-table/import')
          .set('Cookie', cookie)
          .send({
            adapter: 's3',
            content: makeTaskTable({ name, acronym: `${batchPrefix}-${i}` }),
            sourceName: `${name}.xml`,
          }),
      ),
    );
    const elapsed = Date.now() - started;

    for (const res of results) expect(res.status).toBe(201);
    planIds.push(...results.map((r) => r.body.data.planId as number));
    expect(new Set(planIds).size).toBe(BULK_SIZE); // no id collision under concurrency
    log.ok(`${BULK_SIZE} plans created in ${elapsed}ms`);
  }, 60_000);

  // @plan T09.5
  // @covers EOCP-E9-02
  it('Step 2 – concurrent commits complete without crash or deadlock', async () => {
    log.step('Step 2 — commit all plans concurrently, then check API liveness');
    const started = Date.now();
    const results = await Promise.all(
      planIds.map((id) =>
        request(API).post(`/task-table/import/${id}/commit`).set('Cookie', cookie),
      ),
    );
    const elapsed = Date.now() - started;

    for (const res of results) expect(res.status).toBe(200);

    // A deadlock would leave the API unresponsive rather than erroring.
    const health = await request(API).get('/healthz');
    log.http('GET', '/healthz', health.status, health.body);
    expect(health.status).toBe(200);
    log.ok(`${planIds.length} commits in ${elapsed}ms, API still responsive`);
  }, 120_000);

  // @plan T09.5
  // @covers EOCP-E9-02
  it('Step 3 – every valid table produced its records', async () => {
    log.step('Step 3 — verify all scripts exist, plus one oversized table');
    const res = await request(API)
      .get('/processing-script')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    const present = new Set(
      (res.body.data as Array<Record<string, unknown>>).map((s) => s.name),
    );
    const missing = names.filter((n) => !present.has(n));
    expect(missing).toEqual([]);
    log.ok(`all ${BULK_SIZE} bulk tables ingested`);

    const largeName = uniqueName('T09.5-large');
    const large = makeTaskTable({
      name: largeName,
      acronym: largeName,
      tasks: Array.from({ length: LARGE_TASK_COUNT }, (_, i) => ({
        name: `task-${i}`,
        file: `task_${i}.sh`,
      })),
    });
    const imported = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 's3', content: large, sourceName: `${largeName}.xml` });
    log.http('POST', '/task-table/import (large)', imported.status, {
      accepted: imported.body.data?.summary?.acceptedCount,
    });
    expect(imported.status).toBe(201);
    expect(imported.body.data.summary.acceptedCount).toBe(LARGE_TASK_COUNT);
    log.ok(`oversized table with ${LARGE_TASK_COUNT} tasks ingested`);
  }, 60_000);
});
