import { Client } from 'pg';
import { CONFIG } from '../../constants/config';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T08.2 — Processor version traceability in logs and outputs.
// There is no public REST endpoint exposing processing_script_version yet,
// so traceability is asserted at the data layer: every version row keeps
// an `imageUrl`/`imageTag`/`runtime` triple plus a numeric `version` so a
// running job can be traced back to a specific image.
// Section T8 — Versioning (Processors).

const log = makeLogger('T08.2');

async function withDbClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

describe('T08.2 — Processor version traceability in logs and outputs', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T08.2
  // @covers EOCP-E8-02
  it('processing_script_version carries imageUrl, imageTag and runtime', async () => {
    log.step('DB query — processing_script_version');
    await withDbClient(async (c) => {
      const r = await c.query<{
        id: string;
        version: string;
        runtime: string;
        imageUrl: string | null;
        imageTag: string | null;
      }>(
        `SELECT id, version, runtime, "imageUrl", "imageTag"
           FROM "processing_script_version"
           LIMIT 1`,
      );
      log.ok(`rows found: ${r.rows.length}`);
      expect(r.rows.length).toBeGreaterThan(0);
      const row = r.rows[0];
      log.ok(`version=${row.version}, runtime=${row.runtime}, imageUrl=${row.imageUrl}, imageTag=${row.imageTag}`);
      expect(typeof row.version).toBe('string');
      expect(typeof row.runtime).toBe('string');
      expect(row.imageUrl).toBeTruthy();
      expect(row.imageTag).toBeTruthy();
    });
  });
});
