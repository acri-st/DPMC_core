import { Client } from 'pg';
import { CONFIG } from '../../constants/config';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from '../t01/_env-check';

// @plan T08.3 — Versioning of processor executables and auxiliary files.
// Asserts at the data layer that every processing_script_version owns its
// own set of executable rows (path, name, sequence, scriptType) so the
// system can replay a specific version of a chain end-to-end.
// Section T8 — Versioning (Processors).

const log = makeLogger('T08.3');

async function withDbClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

describe('T08.3 — Versioning of processor executables and auxiliary files', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
  });

  // @plan T08.3
  // @covers EOCP-E8-02 EOCP-E8-03
  it('processing_script_executable rows are tied to a specific version', async () => {
    log.step('DB query — processing_script_executable');
    await withDbClient(async (c) => {
      // Pick the first version that has at least one executable
      const versionRes = await c.query<{ processingScriptVersionId: string }>(
        `SELECT "processingScriptVersionId"
           FROM "processing_script_executable"
           GROUP BY "processingScriptVersionId"
           HAVING COUNT(*) > 0
           LIMIT 1`,
      );
      log.ok(`version rows found: ${versionRes.rows.length}`);
      expect(versionRes.rows.length).toBeGreaterThan(0);
      const versionId = versionRes.rows[0].processingScriptVersionId;

      const r = await c.query<{
        id: string;
        scriptType: string;
        path: string;
        name: string;
        sequence: number;
      }>(
        `SELECT id, "scriptType", path, name, sequence
           FROM "processing_script_executable"
           WHERE "processingScriptVersionId" = $1
           ORDER BY sequence ASC`,
        [versionId],
      );

      log.ok(`executables for versionId=${versionId}: ${r.rows.length}`);
      expect(r.rows.length).toBeGreaterThan(0);
      for (const row of r.rows) {
        expect(row.path).toBeTruthy();
        expect(row.name).toBeTruthy();
        expect(row.scriptType).toBeTruthy();
        expect(typeof row.sequence).toBe('number');
      }
    });
  });
});
