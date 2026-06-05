import { Client } from 'pg';
import { CONFIG } from '../../constants/config';
import { FIXTURES } from '../fixtures';

// Uses raw SQL (not @dpmc/prisma) because the generated client is ESM-only
// and ts-jest runs in CJS context. Seeds the smallest set of rows needed
// for the e2e suite to bootstrap (1 data center, 1 default project, 1 pool,
// 1 processing script with one version + executable). Hosts are registered
// at test time via the worker API.
async function runSeed() {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    await c.query(
      `INSERT INTO "data_center"
         (id, name, code, latitude, longitude,
          "emissionFactor", "energyIntensity", pue)
       VALUES ($1, $2, $3, 0, 0, 0.5, 200, 1.5)
       ON CONFLICT (id) DO UPDATE
         SET "emissionFactor" = EXCLUDED."emissionFactor",
             "energyIntensity" = EXCLUDED."energyIntensity",
             pue = EXCLUDED.pue`,
      [FIXTURES.dataCenter.id, FIXTURES.dataCenter.name, FIXTURES.dataCenter.code],
    );

    await c.query(
      `INSERT INTO "project"
         (id, identifier, name, "isActive", "isDefault",
          "priorityWeight", "allowedProductionModes", "updatedAt")
       VALUES ($1, $2, $3, true, true, 1.0,
         ARRAY['nominal','test','reprocessing','on_demand','on_the_fly','hpc','generic']::"production_mode"[],
         NOW())
       ON CONFLICT (id) DO UPDATE
         SET "allowedProductionModes" = EXCLUDED."allowedProductionModes",
             "updatedAt" = NOW()`,
      [FIXTURES.project.id, FIXTURES.project.identifier, FIXTURES.project.name],
    );

    await c.query(
      `INSERT INTO "pool" (id, name, "updatedAt") VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [FIXTURES.pool.id, FIXTURES.pool.name],
    );

    await c.query(
      `INSERT INTO "processing_script" (id, name, acronym, "updatedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.processingScript.id,
        FIXTURES.processingScript.name,
        FIXTURES.processingScript.acronym,
      ],
    );

    await c.query(
      `INSERT INTO "processing_script_version"
         (id, "processingScriptId", version, "isLatest", runtime,
          "imageUrl", "imageTag",
          "requiredCpu", "requiredRam", "requiredDisk", "updatedAt")
       VALUES ($1, $2, $3, true, 'docker',
               'registry.test/imagemagick', '1.0',
               2, 4, 10, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.processingScriptVersion.id,
        FIXTURES.processingScript.id,
        FIXTURES.processingScriptVersion.version,
      ],
    );

    await c.query(
      `UPDATE "processing_script"
         SET "defaultVersionId" = $1
         WHERE id = $2`,
      [FIXTURES.processingScriptVersion.id, FIXTURES.processingScript.id],
    );

    await c.query(
      `INSERT INTO "processing_script_executable"
         (id, "processingScriptVersionId", "scriptType", stage,
          path, name, sequence, args)
       VALUES ($1, $2, 'bash', 'exe', '/opt/imagemagick', 'resize.sh', 0, '')
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.processingScriptExecutable.id,
        FIXTURES.processingScriptVersion.id,
      ],
    );

    await c.query(
      `INSERT INTO "auxiliary_configuration"
         (id, name, baseline, "updatedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.auxiliaryConfiguration.id,
        FIXTURES.auxiliaryConfiguration.name,
        FIXTURES.auxiliaryConfiguration.baseline,
      ],
    );

    await c.query(
      `INSERT INTO "processor_x_version"
         (id, "processingScriptVersionId", "auxiliaryConfigurationId", baseline)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.processorVersion.id,
        FIXTURES.processingScriptVersion.id,
        FIXTURES.auxiliaryConfiguration.id,
        FIXTURES.processorVersion.baseline,
      ],
    );
    // The project_energy view is not in the Prisma migration (deferred feature).
    // Create it here so the /metrics/co2 endpoint can query it without crashing.
    // It aggregates completed job energy from avgPower × duration per project.
    await c.query(`
      CREATE OR REPLACE VIEW project_energy AS
      SELECT
        j."projectId" AS project_id,
        COALESCE(
          SUM(
            j."avgPower" *
            EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt")) / 3600.0
          ), 0
        ) AS energy_wh,
        COALESCE(
          SUM(EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt"))), 0
        ) AS cpu_seconds
      FROM job j
      WHERE j."endedAt" IS NOT NULL
        AND j."startedAt" IS NOT NULL
        AND j."avgPower" IS NOT NULL
      GROUP BY j."projectId"
    `);
  } finally {
    await c.end();
  }
}

export const seed = {
  run: runSeed,
};
