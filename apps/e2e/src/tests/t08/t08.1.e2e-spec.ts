import request from 'supertest';
import { API } from '../../support/auth';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROCESSING_SCRIPT_ID } from './_shared';

// @plan T08.1 — Coexistence of multiple processor versions.
// Verifies the public processing-script API exposes scripts and that each
// script can declare a default version (the prerequisite for being able to
// "select" between versions). Section T8 — Versioning (Processors).

const log = makeLogger('T08.1');

describe('T08.1 — Coexistence of multiple processor versions', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T08.1
  // @covers EOCP-E8-01
  it('GET /processing-script lists scripts with id, acronym and defaultVersionId', async () => {
    log.step('GET /processing-script');
    const res = await request(API).get('/processing-script');
    log.http('GET', '/processing-script', res.status, res.status === 200 ? { count: res.body.data?.length } : res.body);
    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const script of res.body.data) {
      expect(typeof script.id).toBe('number');
      expect(typeof script.acronym).toBe('string');
    }

    const withVersion = res.body.data.find(
      (s: { defaultVersionId: number | null }) => s.defaultVersionId !== null,
    );
    log.ok(`script with defaultVersionId: ${withVersion?.id}`);
    expect(withVersion).toBeDefined();
    expect(typeof withVersion.defaultVersionId).toBe('number');
  });

  // @plan T08.1
  // @covers EOCP-E8-01
  it('GET /processing-script/:id returns the script by id', async () => {
    log.step(`GET /processing-script/${PROCESSING_SCRIPT_ID}`);
    const res = await request(API)
      .get(`/processing-script/${PROCESSING_SCRIPT_ID}`);
    log.http('GET', `/processing-script/${PROCESSING_SCRIPT_ID}`, res.status, res.status === 200 ? { id: res.body.data.id, acronym: res.body.data.acronym } : res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PROCESSING_SCRIPT_ID);
    expect(typeof res.body.data.acronym).toBe('string');
    log.ok(`script found: ${res.body.data.id}, acronym=${res.body.data.acronym}`);
  });
});
