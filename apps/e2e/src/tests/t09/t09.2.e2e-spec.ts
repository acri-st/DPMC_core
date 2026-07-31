import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { makeTaskTable, uniqueName } from './_shared';

// @plan T09.2 — Automated ingestion of Task Tables
// @covers EOCP-E9-02
//
// Description: This test verifies that Task Tables can be ingested automatically using templates,
//   scripts, or dedicated interfaces.
// Prerequisites: An automated Task Table ingestion mechanism is configured. Input templates or
//   scripts are available.
// Steps:
//   1. Provide a valid Task Table to the ingestion interface → Table is accepted
//   2. Trigger automated ingestion → Ingestion starts
//   3. Inspect generated DPMC records → Records are created automatically

const log = makeLogger('T09.2');

describe('T09.2 — Automated ingestion of Task Tables', () => {
  let cookie: string;
  let planId: number;
  let scriptId: number;

  const scriptName = uniqueName('T09.2-proc');
  const taskTable = makeTaskTable({ name: scriptName, acronym: 'T092' });

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  // @plan T09.2
  // @covers EOCP-E9-02
  it('Step 1 – the ingestion interface accepts a valid Task Table', async () => {
    log.step('Step 1 — POST /task-table/import (programmatic interface)');
    const res = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({
        adapter: 's3',
        content: taskTable,
        sourceName: `${scriptName}.xml`,
      });
    log.http('POST', '/task-table/import', res.status, res.body);
    expect(res.status).toBe(201);
    planId = res.body.data.planId;
    log.ok(`accepted, plan ${planId}`);
  });

  // @plan T09.2
  // @covers EOCP-E9-02
  it('Step 2 – ingestion starts and reports its outcome', async () => {
    log.step('Step 2 — POST commit, then read the history entry back');
    const commit = await request(API)
      .post(`/task-table/import/${planId}/commit`)
      .set('Cookie', cookie);
    log.http('POST', `/task-table/import/${planId}/commit`, commit.status, commit.body);
    expect(commit.status).toBe(200);
    scriptId = commit.body.data.scriptId;

    const entry = await request(API)
      .get(`/task-table/import/${planId}`)
      .set('Cookie', cookie);
    log.http('GET', `/task-table/import/${planId}`, entry.status, entry.body.data);
    expect(entry.status).toBe(200);
    expect(entry.body.data.committedAt).not.toBeNull();
    log.ok(`ingestion completed at ${entry.body.data.committedAt}`);
  });

  // @plan T09.2
  // @covers EOCP-E9-02
  it('Step 3 – the DPMC records were created without further manual input', async () => {
    log.step('Step 3 — GET /processing-script/:id');
    const res = await request(API)
      .get(`/processing-script/${scriptId}`)
      .set('Cookie', cookie);
    log.http('GET', `/processing-script/${scriptId}`, res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(scriptName);
    log.ok(`script ${scriptId} created automatically from the Task Table`);
  });
});
