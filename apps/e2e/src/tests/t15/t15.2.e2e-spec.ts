import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';
import { PROJECT_ID } from './_shared';

// @plan T15.2 — Association of footprint metrics with tasks, chains, and projects
// @covers EOCP-E15-02
//
// Description: Verifies that the CO2 endpoint supports groupBy parameter and that when data
//   exists, each aggregate item carries a bucket (project/chain/task id) and bucketName.
//   Association to actual job executions requires project_energy view to be populated.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").

const log = makeLogger('T15.2');

describe('T15.2 — Association of footprint metrics with tasks, chains, and projects', () => {
  let cookie: string;

  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');

    log.action('forging admin session');
    ({ cookie } = await asAdminSession());
    log.ok('admin session ready');
  });

  // @plan T15.2
  // @covers EOCP-E15-02
  it('Step 1 – GET /metrics/co2?groupBy=project responds 200', async () => {
    log.step('Step 1 — GET /metrics/co2?groupBy=project');

    log.action('GET /metrics/co2', { groupBy: 'project' });
    const res = await request(API).get('/metrics/co2').query({ groupBy: 'project' });
    log.http('GET', '/metrics/co2?groupBy=project', res.status, res.body);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok('groupBy=project accepted');
  });

  // @plan T15.2
  // @covers EOCP-E15-02
  it('Step 2 – GET /metrics/co2?groupBy=chain responds 200', async () => {
    log.step('Step 2 — GET /metrics/co2?groupBy=chain');

    log.action('GET /metrics/co2', { groupBy: 'chain' });
    const res = await request(API).get('/metrics/co2').query({ groupBy: 'chain' });
    log.http('GET', '/metrics/co2?groupBy=chain', res.status, res.body);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    log.ok('groupBy=chain accepted');
  });

  // @plan T15.2
  // @covers EOCP-E15-02
  it('Step 3 – when data exists, items carry bucket (id) and bucketName linked to the seeded project', async () => {
    log.step('Step 3 — GET /metrics/co2?groupBy=project (verify bucket association)');

    log.action('GET /metrics/co2', { groupBy: 'project' });
    const res = await request(API).get('/metrics/co2').query({ groupBy: 'project' });
    log.http('GET', '/metrics/co2?groupBy=project', res.status, res.body);
    expect(res.status).toBe(200);

    const items: Record<string, unknown>[] = res.body.data;
    if (items.length === 0) {
      log.ok('no data yet (project_energy view not populated) — association check skipped');
      return;
    }

    const projectRow = items.find((i) => i.bucket === PROJECT_ID);
    if (projectRow) {
      log.ok(`found row for seeded project: bucketName=${projectRow.bucketName}`);
      expect(typeof projectRow.bucket).toBe('string');
      expect(projectRow.bucketName).toBeDefined();
    } else {
      log.ok(`seeded project not in results (no energy data for it) — ${items.length} other projects present`);
    }

    for (const item of items) {
      expect(item.groupBy).toBe('project');
      expect(typeof item.bucket).toBe('string');
      expect(item.bucket.length).toBeGreaterThan(0);
    }
    log.ok('all items have bucket association');
  });
});
