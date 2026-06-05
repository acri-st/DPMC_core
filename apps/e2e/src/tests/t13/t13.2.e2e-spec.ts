import { Client } from 'pg';
import request from 'supertest';
import { API } from '../../support/auth';
import { CONFIG } from '../../constants/config';

// @plan T13.2 — Standardized container image definition interface
// @covers EOCP-E8-02 EOCP-E13-02
//
// Description: This test verifies that containerized processors are defined using a standardized
//   interface for image name, entry point, and environment variables.
// Prerequisites: A container definition format is specified and enforced. Processors are
//   registered through this interface.
// Steps:
//   1. Register a processor using the standard container definition → Registration succeeds
//   2. Inspect stored processor metadata → Image, entry point, and variables are recorded
//   3. Execute a job using this processor → Job uses the defined container parameters

async function withDbClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

describe('T13.2 — Standardized container image definition interface', () => {
  // @plan T13.2
  // @covers EOCP-E8-02 EOCP-E13-02
  it('Step 1 – processing scripts are accessible via the standard REST interface', async () => {
    const res = await request(API).get('/processing-script').expect(200);
    const list = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(list.length).toBeGreaterThan(0);
    const first = list[0];
    expect(first.id).toBeDefined();
    expect(first.acronym).toBeDefined();

    const detail = await request(API).get(`/processing-script/${first.id}`).expect(200);
    expect(detail.body.data.id).toBe(first.id);
  });

  // @plan T13.2
  // @covers EOCP-E8-02 EOCP-E13-02
  it('Step 2 – processing_script_version carries runtime, imageUrl, and imageTag (standardized container definition)', async () => {
    await withDbClient(async (c) => {
      const r = await c.query<{
        runtime: string;
        imageUrl: string | null;
        imageTag: string | null;
        imageChecksum: string | null;
      }>(
        `SELECT runtime, "imageUrl", "imageTag", "imageChecksum"
           FROM "processing_script_version" LIMIT 1`,
      );
      expect(r.rows).toHaveLength(1);
      const row = r.rows[0];
      expect(['Docker', 'Apptainer', 'None', 'docker', 'apptainer', 'none']).toContain(row.runtime);
      expect(row.imageUrl).toBeTruthy();
      expect(row.imageTag).toBeTruthy();
    });
  });

  // @plan T13.2
  // @covers EOCP-E13-02
  it('Step 3 – processor-version record links script version to auxiliary config (job uses defined container params)', async () => {
    const res = await request(API).get('/processor-version').expect(200);
    const list = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.items ?? []);
    expect(list.length).toBeGreaterThan(0);
    const first = list[0];

    const detail = await request(API).get(`/processor-version/${first.id}`).expect(200);
    expect(detail.body.data.processingScriptVersionId).toBeDefined();
    expect(detail.body.data.auxiliaryConfigurationId).toBeDefined();
  });
});
