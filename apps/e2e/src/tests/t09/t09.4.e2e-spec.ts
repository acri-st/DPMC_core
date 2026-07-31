import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T09.4 — Rejection of invalid Task Table formats
// @covers EOCP-E9-01
//
// Description: This test verifies that Task Tables not complying with the expected format are
//   detected and rejected.
// Prerequisites: Validation rules for Task Table formats are defined.
// Steps:
//   1. Submit a malformed Task Table → Validation is triggered
//   2. Observe ingestion result → Table is rejected
//   3. Inspect error message → Validation error is clearly reported

const log = makeLogger('T09.4');

// Not XML at all; the root element the adapter requires is missing; and a
// document that parses but omits the mandatory Processor_Name / Version.
const NOT_XML = 'this is not a task table';
const WRONG_ROOT = '<?xml version="1.0"?><Something_Else><A>1</A></Something_Else>';
const MISSING_FIELDS = '<?xml version="1.0"?><Task_Table></Task_Table>';

describe('T09.4 — Rejection of invalid Task Table formats', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    ({ cookie } = await asAdminSession());
    log.ok('env is reachable, admin session opened');
  });

  // @plan T09.4
  // @covers EOCP-E9-01
  it('Step 1 – validation is triggered on a malformed Task Table', async () => {
    log.step('Step 1 — POST /task-table/import (document is not a Task Table)');
    const res = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 's3', content: NOT_XML });
    log.http('POST', '/task-table/import', res.status, res.body);
    expect(res.status).toBe(400);
    log.ok('validation rejected the document with 400');
  });

  // @plan T09.4
  // @covers EOCP-E9-01
  it('Step 2 – structurally invalid tables are rejected, not partially ingested', async () => {
    log.step('Step 2 — wrong root element, then missing mandatory fields');
    for (const [label, content] of [
      ['wrong root element', WRONG_ROOT],
      ['missing Processor_Name/Version', MISSING_FIELDS],
    ] as const) {
      const res = await request(API)
        .post('/task-table/import')
        .set('Cookie', cookie)
        .send({ adapter: 's3', content });
      log.http('POST', `/task-table/import (${label})`, res.status, res.body);
      expect(res.status).toBe(400);
    }

    // An unknown adapter is rejected the same way rather than defaulting.
    const unknown = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 'does-not-exist', content: MISSING_FIELDS });
    log.http('POST', '/task-table/import (unknown adapter)', unknown.status, unknown.body);
    expect(unknown.status).toBe(400);
    log.ok('all three invalid submissions rejected');
  });

  // @plan T09.4
  // @covers EOCP-E9-01
  it('Step 3 – the error names the reason for the rejection', async () => {
    log.step('Step 3 — inspect the error body');
    const res = await request(API)
      .post('/task-table/import')
      .set('Cookie', cookie)
      .send({ adapter: 's3', content: WRONG_ROOT });
    log.http('POST', '/task-table/import', res.status, res.body);
    expect(res.status).toBe(400);

    const message = res.body.error?.message as string;
    expect(message).toBeTruthy();
    // Names what failed, not a bare "Bad Request".
    expect(message).toMatch(/Task_Table|TT parse failed/i);
    expect(message).not.toMatch(/at Object|\.ts:\d+/); // no stack trace leaked
    log.ok(`error message: "${message}"`);
  });
});
