import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { makeTaskTable, uniqueName } from './_shared';

// @plan T09.1 — Manual conversion of Task Tables into DPMC records
// @covers EOCP-E9-01
//
// Description: This test verifies that operators can manually convert Task Tables into valid DPMC
//   database records using provided tools or interfaces.
// Prerequisites: A valid Task Table is available. At least one operator has permissions to perform
//   Task Table conversion.
// Steps:
//   1. Load a Task Table into the conversion tool → Task Table is parsed
//   2. Execute manual conversion → DPMC records are created
//   3. Inspect created records → Records match Task Table content

const log = makeLogger('T09.1');

describe('T09.1 — Manual conversion of Task Tables into DPMC records', () => {
  let cookie: string;
  let planId: number;

  const scriptName = uniqueName('T09.1-proc');
  const taskTable = makeTaskTable({
    name: scriptName,
    version: '2.4',
    acronym: 'T091',
    tasks: [
      { name: 'stage-in', file: 'stage_in.sh', stage: 'Pre' },
      { name: 'run', file: 'run.sh', stage: 'Exe' },
      { name: 'stage-out', file: 'stage_out.sh', stage: 'Post' },
    ],
  });

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  // @plan T09.1
  // @covers EOCP-E9-01
  it('Step 1 – the Task Table is parsed into an import plan', async () => {
    log.step('Step 1 — POST /task-table/import');
    const res = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 's3', content: taskTable, sourceName: 'T09.1.xml' });
    log.http('POST', '/task-table/import', res.status, res.body);
    expect(res.status).toBe(201);

    planId = res.body.data.planId;
    expect(planId).toBeGreaterThan(0);
    // Three <Task> entries in, three executables accepted.
    expect(res.body.data.summary.acceptedCount).toBe(3);
    expect(res.body.data.summary.rejectedCount).toBe(0);
    expect(res.body.data.summary.ir.processingScript.name).toBe(scriptName);
    log.ok(`parsed into plan ${planId}, 3 executables accepted`);
  });

  // @plan T09.1
  // @covers EOCP-E9-01
  it('Step 2 – committing the plan creates the DPMC records', async () => {
    log.step('Step 2 — POST /task-table/import/:planId/commit');
    const res = await request(API)
      .post(`/task-table/import/${planId}/commit`)
      .set('Cookie', cookie);
    log.http('POST', `/task-table/import/${planId}/commit`, res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.scriptId).toBeGreaterThan(0);
    expect(res.body.data.versionId).toBeGreaterThan(0);
    log.ok(`created script ${res.body.data.scriptId}`);
  });

  // @plan T09.1
  // @covers EOCP-E9-01
  it('Step 3 – the created records match the Task Table content', async () => {
    log.step('Step 3 — GET /processing-script and compare with the source');
    const res = await request(API)
      .get('/processing-script')
      .set('Cookie', cookie);
    log.http('GET', '/processing-script', res.status, {
      count: res.body.data?.length,
    });
    expect(res.status).toBe(200);

    const script = (res.body.data as Array<Record<string, unknown>>).find(
      (s) => s.name === scriptName,
    );
    expect(script).toBeDefined();
    expect(script!.acronym).toBe('T091');
    log.ok(`script "${scriptName}" (acronym T091) present in the catalogue`);
  });
});
