import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { makeTaskTable, uniqueName } from './_shared';

// @plan T09.3 — Traceability of Task Table conversions
// @covers EOCP-E9-03
//
// Description: This test verifies that all Task Table conversions are fully traceable through logs
//   and audit records.
// Prerequisites: Audit logging is enabled for Task Table ingestion.
// Steps:
//   1. Perform a Task Table conversion → Conversion is logged
//   2. Inspect audit logs → Source table and records are referenced
//   3. Reconstruct conversion history → Full traceability is possible

const log = makeLogger('T09.3');

describe('T09.3 — Traceability of Task Table conversions', () => {
  let cookie: string;
  let planId: number;
  let scriptId: number;
  let versionId: number;

  const scriptName = uniqueName('T09.3-proc');
  const sourceName = `${scriptName}.xml`;
  const taskTable = makeTaskTable({ name: scriptName, acronym: 'T093' });

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  // @plan T09.3
  // @covers EOCP-E9-03
  it('Step 1 – the conversion is recorded in the ingestion history', async () => {
    log.step('Step 1 — import + commit, then list the history');
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
    scriptId = commit.body.data.scriptId;
    versionId = commit.body.data.versionId;

    const history = await request(API)
      .get('/task-table/import')
      .set('Cookie', cookie);
    log.http('GET', '/task-table/import', history.status, {
      count: history.body.data?.length,
    });
    expect(history.status).toBe(200);

    const entry = (history.body.data as Array<Record<string, unknown>>).find(
      (e) => e.planId === planId,
    );
    expect(entry).toBeDefined();
    expect(entry!.committedAt).not.toBeNull();
    log.ok(`conversion ${planId} present in the history`);
  });

  // @plan T09.3
  // @covers EOCP-E9-03
  it('Step 2 – the entry references both the source table and the records', async () => {
    log.step(`Step 2 — GET /task-table/import/${planId}`);
    const res = await request(API)
      .get(`/task-table/import/${planId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task-table/import/${planId}`, res.status, {
      sourceName: res.body.data?.sourceName,
      committedScriptId: res.body.data?.committedScriptId,
    });
    expect(res.status).toBe(200);

    // Source side: the document that was ingested is identifiable and recoverable.
    expect(res.body.data.sourceName).toBe(sourceName);
    expect(res.body.data.sourceContent).toBe(taskTable);
    // Record side: the rows the conversion produced.
    expect(res.body.data.committedScriptId).toBe(scriptId);
    expect(res.body.data.committedVersionId).toBe(versionId);
    log.ok(`source "${sourceName}" ↔ script ${scriptId} / version ${versionId}`);
  });

  // @plan T09.3
  // @covers EOCP-E9-03
  it('Step 3 – the conversion can be reconstructed end to end', async () => {
    log.step('Step 3 — walk from the history entry back to the live records');
    const entry = await request(API)
      .get(`/task-table/import/${planId}`)
      .set('Cookie', cookie);
    expect(entry.status).toBe(200);

    const script = await request(API)
      .get(`/processing-script/${entry.body.data.committedScriptId}`)
      .set('Cookie', cookie);
    log.http('GET', `/processing-script/${scriptId}`, script.status, script.body);
    expect(script.status).toBe(200);
    expect(script.body.data.name).toBe(scriptName);

    // The stored IR is the intermediate step, so the whole chain
    // source document → IR → DPMC records is recoverable from the entry alone.
    expect(entry.body.data.ir.processingScript.name).toBe(scriptName);
    log.ok('full chain source → IR → records reconstructed from the history entry');
  });
});
