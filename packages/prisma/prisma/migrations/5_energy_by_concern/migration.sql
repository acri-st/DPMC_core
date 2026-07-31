-- Splits job energy into the concerns DPMC bills separately and moves the
-- emission factor from a fleet-wide average to the data centre that actually
-- ran the job.
--
-- Before this migration the CO2 of a job was independent of where it ran,
-- which made carbon-aware placement unobservable: moving a job to a greener
-- site changed nothing in the reported figure.
--
-- Split of responsibilities, per DAMPS.ACR.DOC.031 §Calculation formulas:
--   * Computation — CO2e = (Pavg × t / 1000) × PUE × emissionFactor. Power is
--     derived from the host's TDP, so the Wh is computed by the API and stored
--     on the job.
--   * Transfer — CO2e = Σ Volume(Go) × Intensity(kWh/Go) × emissionFactor.
--     Intensity is DataCenter.energyIntensity, so the Wh is derived here in
--     the view from the raw byte counters. Re-tuning a site's intensity then
--     retroactively corrects its history, exactly as it does for pue.
--   * Storage — designed in the doc, not implemented.

ALTER TABLE "job"
  ADD COLUMN "energyCpuWh"      DOUBLE PRECISION,
  ADD COLUMN "energyGpuWh"      DOUBLE PRECISION,
  ADD COLUMN "energyMeasuredAt" TIMESTAMPTZ;

-- The reconciler polls for terminal jobs still awaiting measurement. Partial
-- index: once a job is measured it drops out of the index for good, so this
-- stays small however long the job table grows.
CREATE INDEX "job_energy_pending_idx"
  ON "job" ("endedAt")
  WHERE "energyMeasuredAt" IS NULL;

-- Column sets change, so CREATE OR REPLACE is not an option. Dropped
-- innermost-last because project_energy depends on task_energy depends on
-- batch_energy.
DROP VIEW IF EXISTS "project_energy";
DROP VIEW IF EXISTS "task_energy";
DROP VIEW IF EXISTS "batch_energy";

-- Single source of truth: one row per job, carrying its per-concern Wh, the
-- emission factor of its host's data centre, and the resulting grams. Every
-- rollup below is a plain SUM over this view, and the API queries it directly
-- when it needs a date range or a groupBy the rollups do not cover.
CREATE VIEW "job_energy" AS
SELECT
  j.id                  AS job_id,
  j."batchId"           AS batch_id,
  b."taskId"            AS task_id,
  b."processingChainId" AS processing_chain_id,
  j."projectId"         AS project_id,
  j."hostId"            AS host_id,
  j."startedAt"         AS started_at,
  j."endedAt"           AS ended_at,
  CASE
    WHEN j."startedAt" IS NOT NULL
     AND j."endedAt" IS NOT NULL
     AND j."endedAt" > j."startedAt"
    THEN EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt")) * 1000
  END                   AS duration_ms,
  m.cpu_seconds,
  m.disk_read_bytes,
  m.disk_write_bytes,
  m.net_rx_bytes,
  m.net_tx_bytes,
  e.cpu_wh,
  e.gpu_wh,
  e.ingress_wh,
  e.egress_wh,
  e.cpu_wh + e.gpu_wh + e.ingress_wh + e.egress_wh                        AS energy_wh,
  f.factor                                                                AS emission_factor,
  e.cpu_wh     / 1000.0 * f.factor                                        AS cpu_co2_grams,
  e.gpu_wh     / 1000.0 * f.factor                                        AS gpu_co2_grams,
  e.ingress_wh / 1000.0 * f.factor                                        AS ingress_co2_grams,
  e.egress_wh  / 1000.0 * f.factor                                        AS egress_co2_grams,
  (e.cpu_wh + e.gpu_wh + e.ingress_wh + e.egress_wh) / 1000.0 * f.factor  AS co2_grams
FROM "job" j
JOIN "batch" b       ON b.id = j."batchId"
LEFT JOIN "host" h   ON h.id = j."hostId"
LEFT JOIN "data_center" dc ON dc.id = h."dataCenterId"
-- Fleet average only as a fallback: a job with no host (never allocated, or
-- host since deleted) still has to report something rather than vanish.
--
-- The doc bills transfer at the emission factor "of the main location of the
-- route", which would need a network-route model DPMC does not have. The
-- factor of the data centre at the end of the route is used instead, so a
-- transfer to or from a site on a dirty grid is still charged more than one on
-- a clean grid — just not at the exact figure the doc specifies.
CROSS JOIN LATERAL (
  SELECT COALESCE(
    dc."pue" * dc."emissionFactor",
    (SELECT AVG(d."pue" * d."emissionFactor") FROM "data_center" d),
    0
  ) AS factor,
  COALESCE(
    dc."energyIntensity",
    (SELECT AVG(d."energyIntensity") FROM "data_center" d),
    0
  ) AS intensity_kwh_per_gb
) f
-- double precision, not bigint: the worker reports cpuSeconds as a float and
-- '1.5'::bigint raises rather than truncating.
CROSS JOIN LATERAL (
  SELECT
    COALESCE(NULLIF(j."metrics"->>'cpuSeconds',     '')::double precision, 0) AS cpu_seconds,
    COALESCE(NULLIF(j."metrics"->>'diskReadBytes',  '')::double precision, 0) AS disk_read_bytes,
    COALESCE(NULLIF(j."metrics"->>'diskWriteBytes', '')::double precision, 0) AS disk_write_bytes,
    COALESCE(NULLIF(j."metrics"->>'netRxBytes',     '')::double precision, 0) AS net_rx_bytes,
    COALESCE(NULLIF(j."metrics"->>'netTxBytes',     '')::double precision, 0) AS net_tx_bytes
) m
CROSS JOIN LATERAL (
  SELECT
    COALESCE(
      j."energyCpuWh",
      j."avgPower" * EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt")) / 3600.0,
      0
    )                                AS cpu_wh,
    COALESCE(j."energyGpuWh", 0)     AS gpu_wh,
    -- Volume(Go) × Intensity(kWh/Go) × 1000 = Wh. Go is 1e9 bytes, matching
    -- the decimal convention the doc's Go/kWh figures are quoted in.
    m.net_rx_bytes / 1e9 * f.intensity_kwh_per_gb * 1000.0 AS ingress_wh,
    m.net_tx_bytes / 1e9 * f.intensity_kwh_per_gb * 1000.0 AS egress_wh
) e;

CREATE VIEW "batch_energy" AS
SELECT
  b.id                                       AS batch_id,
  b."projectId"                              AS project_id,
  b."taskId"                                 AS task_id,
  b."processingChainId"                      AS processing_chain_id,
  COALESCE(SUM(je.duration_ms), 0)           AS duration_ms,
  -- Jobs that actually ran. BatchService reports null rather than 0 for a
  -- batch where nothing has executed yet, and this is what tells them apart.
  COUNT(je.duration_ms)                      AS timed_job_count,
  COALESCE(SUM(je.cpu_seconds), 0)           AS cpu_seconds,
  COALESCE(SUM(je.disk_read_bytes), 0)       AS disk_read_bytes,
  COALESCE(SUM(je.disk_write_bytes), 0)      AS disk_write_bytes,
  COALESCE(SUM(je.net_rx_bytes), 0)          AS net_rx_bytes,
  COALESCE(SUM(je.net_tx_bytes), 0)          AS net_tx_bytes,
  COALESCE(SUM(je.cpu_wh), 0)                AS cpu_wh,
  COALESCE(SUM(je.gpu_wh), 0)                AS gpu_wh,
  COALESCE(SUM(je.ingress_wh), 0)            AS ingress_wh,
  COALESCE(SUM(je.egress_wh), 0)             AS egress_wh,
  COALESCE(SUM(je.energy_wh), 0)             AS energy_wh,
  COALESCE(SUM(je.cpu_co2_grams), 0)         AS cpu_co2_grams,
  COALESCE(SUM(je.gpu_co2_grams), 0)         AS gpu_co2_grams,
  COALESCE(SUM(je.ingress_co2_grams), 0)     AS ingress_co2_grams,
  COALESCE(SUM(je.egress_co2_grams), 0)      AS egress_co2_grams,
  COALESCE(SUM(je.co2_grams), 0)             AS co2_grams
FROM "batch" b
LEFT JOIN "job_energy" je ON je.batch_id = b.id
GROUP BY b.id;

CREATE VIEW "task_energy" AS
SELECT
  t.id                                       AS task_id,
  t."projectId"                              AS project_id,
  COALESCE(SUM(je.cpu_seconds), 0)           AS cpu_seconds,
  COALESCE(SUM(je.cpu_wh), 0)                AS cpu_wh,
  COALESCE(SUM(je.gpu_wh), 0)                AS gpu_wh,
  COALESCE(SUM(je.ingress_wh), 0)            AS ingress_wh,
  COALESCE(SUM(je.egress_wh), 0)             AS egress_wh,
  COALESCE(SUM(je.energy_wh), 0)             AS energy_wh,
  COALESCE(SUM(je.cpu_co2_grams), 0)         AS cpu_co2_grams,
  COALESCE(SUM(je.gpu_co2_grams), 0)         AS gpu_co2_grams,
  COALESCE(SUM(je.ingress_co2_grams), 0)     AS ingress_co2_grams,
  COALESCE(SUM(je.egress_co2_grams), 0)      AS egress_co2_grams,
  COALESCE(SUM(je.co2_grams), 0)             AS co2_grams
FROM "task" t
LEFT JOIN "job_energy" je ON je.task_id = t.id
GROUP BY t.id;

CREATE VIEW "processing_chain_energy" AS
SELECT
  pc.id                                      AS processing_chain_id,
  pc."name"                                  AS processing_chain_name,
  COALESCE(SUM(je.cpu_seconds), 0)           AS cpu_seconds,
  COALESCE(SUM(je.cpu_wh), 0)                AS cpu_wh,
  COALESCE(SUM(je.gpu_wh), 0)                AS gpu_wh,
  COALESCE(SUM(je.ingress_wh), 0)            AS ingress_wh,
  COALESCE(SUM(je.egress_wh), 0)             AS egress_wh,
  COALESCE(SUM(je.energy_wh), 0)             AS energy_wh,
  COALESCE(SUM(je.cpu_co2_grams), 0)         AS cpu_co2_grams,
  COALESCE(SUM(je.gpu_co2_grams), 0)         AS gpu_co2_grams,
  COALESCE(SUM(je.ingress_co2_grams), 0)     AS ingress_co2_grams,
  COALESCE(SUM(je.egress_co2_grams), 0)      AS egress_co2_grams,
  COALESCE(SUM(je.co2_grams), 0)             AS co2_grams
FROM "processing_chain" pc
LEFT JOIN "job_energy" je ON je.processing_chain_id = pc.id
GROUP BY pc.id;

CREATE VIEW "project_energy" AS
SELECT
  p.id                                       AS project_id,
  COALESCE(SUM(je.cpu_seconds), 0)           AS cpu_seconds,
  COALESCE(SUM(je.cpu_wh), 0)                AS cpu_wh,
  COALESCE(SUM(je.gpu_wh), 0)                AS gpu_wh,
  COALESCE(SUM(je.ingress_wh), 0)            AS ingress_wh,
  COALESCE(SUM(je.egress_wh), 0)             AS egress_wh,
  COALESCE(SUM(je.energy_wh), 0)             AS energy_wh,
  COALESCE(SUM(je.cpu_co2_grams), 0)         AS cpu_co2_grams,
  COALESCE(SUM(je.gpu_co2_grams), 0)         AS gpu_co2_grams,
  COALESCE(SUM(je.ingress_co2_grams), 0)     AS ingress_co2_grams,
  COALESCE(SUM(je.egress_co2_grams), 0)      AS egress_co2_grams,
  COALESCE(SUM(je.co2_grams), 0)             AS co2_grams
FROM "project" p
LEFT JOIN "job_energy" je ON je.project_id = p.id
GROUP BY p.id;
