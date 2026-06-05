-- Energy aggregation views consumed by MetricsService.refreshCo2 and
-- MetricsCo2Service.aggregate. Per-batch energy rolls up to per-task,
-- then per-project. Built from job metrics (cpuSeconds, disk IO) and
-- avgPower × runtime → Wh.

CREATE OR REPLACE VIEW batch_energy AS
SELECT
  b.id                                                                  AS batch_id,
  b."projectId"                                                         AS project_id,
  COALESCE(SUM(NULLIF(j."metrics"->>'cpuSeconds', '')::bigint), 0)      AS cpu_seconds,
  COALESCE(SUM(NULLIF(j."metrics"->>'diskReadBytes', '')::bigint), 0)  AS disk_read_bytes,
  COALESCE(SUM(NULLIF(j."metrics"->>'diskWriteBytes', '')::bigint), 0) AS disk_write_bytes,
  COALESCE(
    SUM(j."avgPower" * EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt")) / 3600.0),
    0
  )                                                                     AS energy_wh
FROM batch b
LEFT JOIN job j ON j."batchId" = b.id
GROUP BY b.id;

CREATE OR REPLACE VIEW task_energy AS
SELECT
  t.id                                AS task_id,
  t."projectId"                       AS project_id,
  COALESCE(SUM(be.cpu_seconds), 0)    AS cpu_seconds,
  COALESCE(SUM(be.energy_wh), 0)      AS energy_wh
FROM task t
LEFT JOIN batch b        ON b."taskId" = t.id
LEFT JOIN batch_energy be ON be.batch_id = b.id
GROUP BY t.id;

CREATE OR REPLACE VIEW project_energy AS
SELECT
  p.id                                AS project_id,
  COALESCE(SUM(te.cpu_seconds), 0)    AS cpu_seconds,
  COALESCE(SUM(te.energy_wh), 0)      AS energy_wh
FROM project p
LEFT JOIN task_energy te ON te.project_id = p.id
GROUP BY p.id;
