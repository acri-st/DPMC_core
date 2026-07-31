-- Transfer volumes gain a second source and a provenance marker.
--
-- 5_energy_by_concern read netRxBytes/netTxBytes, which only exist when a
-- privileged cAdvisor DaemonSet is running. A cluster enforcing the
-- `restricted` Pod Security profile cannot run one, so the worker now also
-- reports what it staged and the reconciler writes whichever source answered
-- under neutral keys:
--
--   ingressBytes / egressBytes  — the retained figures, whatever the source
--   transferSource              — cadvisor | staged | none
--
-- The legacy netRxBytes/netTxBytes are still read as a fallback so jobs
-- measured by the previous release keep their numbers.

DROP VIEW IF EXISTS "project_energy";
DROP VIEW IF EXISTS "processing_chain_energy";
DROP VIEW IF EXISTS "task_energy";
DROP VIEW IF EXISTS "batch_energy";
DROP VIEW IF EXISTS "job_energy";

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
  m.ingress_bytes,
  m.egress_bytes,
  m.transfer_source,
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
-- factor of the data centre at the end of the route is used instead.
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
--
-- ingress/egress fall back to the 5_energy_by_concern key names so jobs
-- measured by the previous release keep reporting their transfer.
CROSS JOIN LATERAL (
  SELECT
    COALESCE(NULLIF(j."metrics"->>'cpuSeconds',     '')::double precision, 0) AS cpu_seconds,
    COALESCE(NULLIF(j."metrics"->>'diskReadBytes',  '')::double precision, 0) AS disk_read_bytes,
    COALESCE(NULLIF(j."metrics"->>'diskWriteBytes', '')::double precision, 0) AS disk_write_bytes,
    COALESCE(
      NULLIF(j."metrics"->>'ingressBytes', '')::double precision,
      NULLIF(j."metrics"->>'netRxBytes',   '')::double precision,
      0
    ) AS ingress_bytes,
    COALESCE(
      NULLIF(j."metrics"->>'egressBytes', '')::double precision,
      NULLIF(j."metrics"->>'netTxBytes',  '')::double precision,
      0
    ) AS egress_bytes,
    COALESCE(
      NULLIF(j."metrics"->>'transferSource', ''),
      -- Measured before this migration: if it carries cAdvisor counters it
      -- came from cAdvisor, otherwise nothing measured its transfer.
      CASE
        WHEN j."metrics"->>'netRxBytes' IS NOT NULL
          OR j."metrics"->>'netTxBytes' IS NOT NULL
        THEN 'cadvisor'
        WHEN j."energyMeasuredAt" IS NOT NULL THEN 'none'
      END
    ) AS transfer_source
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
    m.ingress_bytes / 1e9 * f.intensity_kwh_per_gb * 1000.0 AS ingress_wh,
    m.egress_bytes  / 1e9 * f.intensity_kwh_per_gb * 1000.0 AS egress_wh
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
  -- Distinct provenances across the batch's jobs, so the console can flag a
  -- batch whose figures do not all come from the same measurement.
  COUNT(DISTINCT je.transfer_source)         AS transfer_source_count,
  MIN(je.transfer_source)                    AS transfer_source,
  COALESCE(SUM(je.cpu_seconds), 0)           AS cpu_seconds,
  COALESCE(SUM(je.disk_read_bytes), 0)       AS disk_read_bytes,
  COALESCE(SUM(je.disk_write_bytes), 0)      AS disk_write_bytes,
  COALESCE(SUM(je.ingress_bytes), 0)         AS ingress_bytes,
  COALESCE(SUM(je.egress_bytes), 0)          AS egress_bytes,
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
