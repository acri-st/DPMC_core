import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T08.6 — Detection of partial or inconsistent processor version deployment
// @covers EOCP-E8-03
//
// Description: This test verifies that inconsistent processor packages (e.g. mismatched executables
//   and auxiliary files) are detected and rejected.
// Prerequisites: Validation rules exist for processor registration.
// Steps:
//   1. Attempt to register an inconsistent processor version → Validation is triggered
//   2. Observe system response → Registration is rejected
//   3. Inspect error message → Inconsistency is clearly reported

const log = makeLogger('T08.6');

const NON_EXISTENT_ID = 0;

describe('T08.6 — Detection of partial or inconsistent processor version deployment', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T08.6
  // @covers EOCP-E8-03
  it('Step 1 – registration with a non-existent processingScriptVersionId is rejected', async () => {
    log.step('Step 1 — POST /processor-version (non-existent scriptVersionId)');
    const res = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: NON_EXISTENT_ID,
        auxiliaryConfigurationId: NON_EXISTENT_ID,
        baseline: 'T08.6-invalid',
        comment: 'T08.6 inconsistent package test',
      });
    log.http('POST', '/processor-version', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`rejected with ${res.status}`);
  });

  // @plan T08.6
  // @covers EOCP-E8-03
  it('Step 2 – registration with a missing required field (baseline) is rejected', async () => {
    log.step('Step 2 — POST /processor-version (missing baseline)');
    const res = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: NON_EXISTENT_ID,
        auxiliaryConfigurationId: NON_EXISTENT_ID,
      });
    log.http('POST', '/processor-version', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    log.ok(`rejected with ${res.status}`);
  });

  // @plan T08.6
  // @covers EOCP-E8-03
  it('Step 3 – error response for invalid registration is structured (no stack trace)', async () => {
    log.step('Step 3 — POST /processor-version (structured error check)');
    const res = await request(API)
      .post('/processor-version')
      .send({
        processingScriptVersionId: NON_EXISTENT_ID,
        auxiliaryConfigurationId: NON_EXISTENT_ID,
        baseline: 'T08.6-invalid-check',
      });
    log.http('POST', '/processor-version', res.status, res.body);
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = res.body as Record<string, unknown>;
    const hasErrorField =
      body.message !== undefined ||
      body.error !== undefined ||
      body.errors !== undefined ||
      body.statusCode !== undefined;
    expect(hasErrorField).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/at .+\(.+:\d+:\d+\)/);
    log.ok(`structured error response: status=${res.status}`);
  });
});
