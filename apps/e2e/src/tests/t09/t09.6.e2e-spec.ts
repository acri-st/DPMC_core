import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { makeTaskTable, uniqueName } from './_shared';

// @plan T09.6 — Replay and audit of Task Table ingestion history
// @covers EOCP-E9-03
//
// Description: This test verifies that it is possible to review and replay Task Table ingestion
//   history for audit or debugging purposes.
// Prerequisites: Ingestion history and metadata are persisted.
// Steps:
//   1. Select a past ingestion event → History entry is accessible
//   2. Inspect stored metadata → Original Task Table is identifiable
//   3. Replay ingestion in test mode → Same records are produced

const log = makeLogger('T09.6');

describe('T09.6 — Replay and audit of Task Table ingestion history', () => {
  let cookie: string;
  let planId: number;

  const scriptName = uniqueName('T09.6-proc');
  const sourceName = `${scriptName}.xml`;
  const taskTable = makeTaskTable({
    name: scriptName,
    version: '3.1',
    acronym: 'T096',
    tasks: [
      { name: 'pre', file: 'pre.sh', stage: 'Pre' },
      { name: 'main', file: 'main.sh', stage: 'Exe' },
    ],
  });

  beforeAll(async () => {
    log.step('beforeAll — ingesting a table to audit later');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());

    const imported = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 's3', content: taskTable, sourceName });
    expect(imported.status).toBe(201);
    planId = imported.body.data.planId;

    const commit = await request(API)
      .post(`/task-table/import/${planId}/commit`)
      .set('Cookie', cookie);
    expect(commit.status).toBe(200);
    log.ok(`seeded ingestion event ${planId}`);
  });

  // @plan T09.6
  // @covers EOCP-E9-03
  it('Step 1 – a past ingestion event is accessible from the history', async () => {
    log.step('Step 1 — GET /task-table/import and select the past event');
    const res = await request(API)
      .get('/task-table/import')
      .set('Cookie', cookie);
    log.http('GET', '/task-table/import', res.status, {
      count: res.body.data?.length,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const entry = (res.body.data as Array<Record<string, unknown>>).find(
      (e) => e.planId === planId,
    );
    expect(entry).toBeDefined();
    expect(entry!.adapter).toBe('s3');
    expect(entry!.createdAt).toBeTruthy();
    log.ok(`event ${planId} retrievable from the history listing`);
  });

  // @plan T09.6
  // @covers EOCP-E9-03
  it('Step 2 – the stored metadata identifies the original Task Table', async () => {
    log.step(`Step 2 — GET /task-table/import/${planId}`);
    const res = await request(API)
      .get(`/task-table/import/${planId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task-table/import/${planId}`, res.status, {
      sourceName: res.body.data?.sourceName,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.sourceName).toBe(sourceName);
    // Byte-for-byte, so the audited document is the one that was submitted.
    expect(res.body.data.sourceContent).toBe(taskTable);
    log.ok('original document recovered byte-for-byte from the history');
  });

  // @plan T09.6
  // @covers EOCP-E9-03
  it('Step 3 – replaying the stored document produces the same records', async () => {
    log.step('Step 3 — re-import the archived document and compare the IR');
    const original = await request(API)
      .get(`/task-table/import/${planId}`)
      .set('Cookie', cookie);
    expect(original.status).toBe(200);

    const replay = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({
        adapter: original.body.data.adapter,
        content: original.body.data.sourceContent,
        sourceName: `replay-${sourceName}`,
      });
    log.http('POST', '/task-table/import (replay)', replay.status, {
      planId: replay.body.data?.planId,
    });
    expect(replay.status).toBe(201);
    expect(replay.body.data.planId).not.toBe(planId);

    // Same input, same conversion: the replayed IR must match the archived one.
    expect(replay.body.data.summary.ir).toEqual(original.body.data.ir);
    expect(replay.body.data.summary.acceptedCount).toBe(
      original.body.data.acceptedCount,
    );
    log.ok('replayed conversion is identical to the archived one');
  });
});
