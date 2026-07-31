-- EOCP-E12-04 — security event logging.
--
-- The API already carried an AuditInterceptor and the client already published
-- a GET /audit-log contract, but nothing persisted the events: the interceptor
-- was a pass-through and no table existed. Write operations are now recorded
-- here and served by the audit-log module.

CREATE TYPE "audit_log_actor_type" AS ENUM ('user', 'system', 'worker', 'orchestrator');
CREATE TYPE "audit_log_action" AS ENUM ('create', 'update', 'delete', 'status_transition', 'replay');

CREATE TABLE "audit_log" (
  "id"            SERIAL PRIMARY KEY,
  "actorId"       TEXT,
  "actorType"     "audit_log_actor_type" NOT NULL,
  "action"        "audit_log_action"     NOT NULL,
  "aggregateType" TEXT                   NOT NULL,
  "aggregateId"   TEXT                   NOT NULL,
  "before"        JSONB,
  "after"         JSONB,
  "metadata"      JSONB,
  "createdAt"     TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX "audit_log_aggregate_idx" ON "audit_log" ("aggregateType", "aggregateId");
CREATE INDEX "audit_log_createdAt_idx"  ON "audit_log" ("createdAt");
