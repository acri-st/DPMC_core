-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "dependency_mode" AS ENUM ('on_success', 'on_failure', 'on_completion', 'on_data_available', 'optional');

-- CreateEnum
CREATE TYPE "container_runtime" AS ENUM ('docker', 'apptainer', 'none');

-- CreateEnum
CREATE TYPE "script_stage" AS ENUM ('pre', 'exe', 'post');

-- CreateEnum
CREATE TYPE "host_status" AS ENUM ('up', 'busy', 'off', 'maintenance');

-- CreateEnum
CREATE TYPE "task_kind" AS ENUM ('chain', 'standalone');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('edited', 'queued', 'running', 'done', 'error', 'suspended');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('waiting', 'ready', 'running', 'success', 'failed', 'skipped', 'cancelled');

-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "batch_kind" AS ENUM ('chain', 'standalone');

-- CreateEnum
CREATE TYPE "script_type" AS ENUM ('bash', 'pgbash', 'plsql', 'sql', 'python', 'binary');

-- CreateEnum
CREATE TYPE "os_type" AS ENUM ('linux', 'darwin', 'windows');

-- CreateEnum
CREATE TYPE "scheduling_priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "host_log_level" AS ENUM ('debug', 'info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "production_mode" AS ENUM ('nominal', 'test', 'reprocessing', 'on_demand', 'on_the_fly', 'hpc', 'generic');

-- CreateEnum
CREATE TYPE "priority_class" AS ENUM ('test', 'on_demand', 'reprocessing', 'nrt', 'super', 'ultra');

-- CreateEnum
CREATE TYPE "production_chain_kind" AS ENUM ('standard', 'watcher');

-- CreateEnum
CREATE TYPE "parameter_kind" AS ENUM ('string', 'number', 'select');

-- CreateEnum
CREATE TYPE "product_type_category" AS ENUM ('static_aux', 'dynamic_aux', 'measurement');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('s3', 'http', 'https', 'nfs');

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "allowedProductionModes" "production_mode"[] DEFAULT ARRAY['generic']::"production_mode"[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_type" (
    "id" SERIAL NOT NULL,
    "acronym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processingLevel" TEXT NOT NULL DEFAULT '0',
    "category" "product_type_category",
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "parentBatchId" INTEGER,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMPTZ,
    "parameters" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_chain_x_product_type" (
    "productionChainId" INTEGER NOT NULL,
    "productTypeId" INTEGER NOT NULL,

    CONSTRAINT "production_chain_x_product_type_pkey" PRIMARY KEY ("productionChainId","productTypeId")
);

-- CreateTable
CREATE TABLE "production_chain" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kind" "production_chain_kind" NOT NULL DEFAULT 'standard',
    "watcherConfig" JSONB,
    "configuration" JSONB,
    "supportedModes" "production_mode"[] DEFAULT ARRAY['generic']::"production_mode"[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "production_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_chain" (
    "id" SERIAL NOT NULL,
    "productionChainId" INTEGER NOT NULL,
    "processingScriptId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "configuration" JSONB,
    "outputs" JSONB,

    CONSTRAINT "processing_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_chain_x_edge" (
    "id" SERIAL NOT NULL,
    "productionChainId" INTEGER NOT NULL,
    "parentChainId" INTEGER NOT NULL,
    "childChainId" INTEGER NOT NULL,
    "dependencyMode" "dependency_mode" NOT NULL DEFAULT 'on_success',
    "condition" JSONB,
    "isFanOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "production_chain_x_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_script" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "defaultVersionId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "processing_script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_script_version" (
    "id" SERIAL NOT NULL,
    "processingScriptId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "runtime" "container_runtime" NOT NULL DEFAULT 'none',
    "imageUrl" TEXT,
    "imageTag" TEXT,
    "imageChecksum" TEXT,
    "requiredCpu" INTEGER NOT NULL DEFAULT 1,
    "requiredRam" BIGINT NOT NULL DEFAULT 0,
    "requiredDisk" BIGINT NOT NULL DEFAULT 0,
    "requiresGpu" BOOLEAN NOT NULL DEFAULT false,
    "gpuCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "processing_script_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_script_executable" (
    "id" SERIAL NOT NULL,
    "processingScriptVersionId" INTEGER NOT NULL,
    "scriptType" "script_type" NOT NULL,
    "stage" "script_stage" NOT NULL DEFAULT 'exe',
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "args" TEXT,

    CONSTRAINT "processing_script_executable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auxiliary_configuration" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "baseline" TEXT,
    "comment" TEXT,
    "parameters" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "auxiliary_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processor_x_version" (
    "id" SERIAL NOT NULL,
    "processingScriptVersionId" INTEGER NOT NULL,
    "auxiliaryConfigurationId" INTEGER NOT NULL,
    "baseline" TEXT NOT NULL,
    "comment" TEXT,
    "parameters" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "processor_x_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "kind" "task_kind" NOT NULL DEFAULT 'chain',
    "productionChainId" INTEGER,
    "processorVersionId" INTEGER,
    "productId" INTEGER,
    "inputDatasetId" INTEGER,
    "executionTag" TEXT NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'edited',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "productionMode" "production_mode" NOT NULL DEFAULT 'generic',
    "priorityClass" "priority_class" NOT NULL DEFAULT 'on_demand',
    "scheduledStartTime" TIMESTAMPTZ NOT NULL,
    "expectedStartTime" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "temporalContext" JSONB,
    "parameters" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schedule" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "kind" "task_kind" NOT NULL DEFAULT 'chain',
    "productionChainId" INTEGER,
    "processorVersionId" INTEGER,
    "productId" INTEGER,
    "productionMode" "production_mode" NOT NULL DEFAULT 'generic',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "priorityClass" "priority_class" NOT NULL DEFAULT 'on_demand',
    "parameters" JSONB,
    "comment" TEXT,
    "lastRunAt" TIMESTAMPTZ,
    "nextRunAt" TIMESTAMPTZ,
    "lastTaskId" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "task_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "productionChainId" INTEGER,
    "processingChainId" INTEGER,
    "fanOutGroupId" TEXT,
    "processorVersionId" INTEGER,
    "parentBatchId" INTEGER,
    "poolId" INTEGER,
    "executionTag" TEXT NOT NULL,
    "kind" "batch_kind" NOT NULL DEFAULT 'chain',
    "status" "batch_status" NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "productionMode" "production_mode" NOT NULL DEFAULT 'generic',
    "priorityClass" "priority_class" NOT NULL DEFAULT 'on_demand',
    "constraints" JSONB,
    "configuration" JSONB,
    "parameters" JSONB,
    "parametersIn" JSONB,
    "parametersOut" JSONB,
    "scheduledAt" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "processingScriptVersionId" INTEGER NOT NULL,
    "processorVersionId" INTEGER,
    "hostId" INTEGER,
    "executionTag" TEXT NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'waiting',
    "pid" INTEGER,
    "parameters" JSONB,
    "outputDir" TEXT,
    "avgPower" DOUBLE PRECISION,
    "dataVolume" BIGINT,
    "resolvedImage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "metrics" JSONB,
    "effectivePriority" DOUBLE PRECISION,
    "expectedStartTime" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_x_host" (
    "poolId" INTEGER NOT NULL,
    "hostId" INTEGER NOT NULL,

    CONSTRAINT "pool_x_host_pkey" PRIMARY KEY ("poolId","hostId")
);

-- CreateTable
CREATE TABLE "host" (
    "id" SERIAL NOT NULL,
    "dataCenterId" INTEGER NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "osType" "os_type" NOT NULL,
    "osVersion" TEXT NOT NULL,
    "schedulingPriority" "scheduling_priority" NOT NULL DEFAULT 'medium',
    "status" "host_status" NOT NULL DEFAULT 'off',
    "processingDir" TEXT NOT NULL,
    "cacheDir" TEXT NOT NULL,
    "nbCores" INTEGER NOT NULL,
    "ram" BIGINT NOT NULL,
    "disk" BIGINT NOT NULL,
    "hasGpu" BOOLEAN NOT NULL DEFAULT false,
    "gpuCount" INTEGER NOT NULL DEFAULT 0,
    "gpuModel" TEXT,
    "containerRuntime" "container_runtime" NOT NULL DEFAULT 'none',
    "tdpW" INTEGER,
    "lastHeartbeatAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_log" (
    "id" SERIAL NOT NULL,
    "hostId" INTEGER NOT NULL,
    "jobId" INTEGER,
    "level" "host_log_level" NOT NULL,
    "message" TEXT NOT NULL,
    "loggedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "keycloakSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" INTEGER NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "containerSize" TEXT NOT NULL DEFAULT 'constrained',
    "lastProjectId" INTEGER,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessToken" BYTEA NOT NULL,
    "refreshToken" BYTEA NOT NULL,
    "accessTokenExpiresAt" TIMESTAMPTZ NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMPTZ NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_center" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "emissionFactor" DOUBLE PRECISION NOT NULL,
    "energyIntensity" DOUBLE PRECISION NOT NULL,
    "pue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "data_center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_x_allocation" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "hostId" INTEGER NOT NULL,
    "reservedCpu" INTEGER NOT NULL,
    "reservedRam" BIGINT NOT NULL,
    "reservedDisk" BIGINT NOT NULL,
    "gpuIndices" INTEGER[],
    "allocatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ,

    CONSTRAINT "job_x_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_metrics" (
    "id" SERIAL NOT NULL,
    "hostId" INTEGER NOT NULL,
    "cpuLoad" DOUBLE PRECISION NOT NULL,
    "memUsage" DOUBLE PRECISION NOT NULL,
    "diskUsage" DOUBLE PRECISION NOT NULL,
    "ioBandwidth" DOUBLE PRECISION,
    "runningJobs" INTEGER NOT NULL,
    "sampledAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_x_ingestion_hook" (
    "id" SERIAL NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "productionChainId" INTEGER,
    "projectId" INTEGER NOT NULL,
    "productionMode" "production_mode" NOT NULL DEFAULT 'reprocessing',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_x_ingestion_hook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_table_import_plan" (
    "id" SERIAL NOT NULL,
    "adapter" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "committedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_table_import_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "media_type" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_catalog" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_catalog_entry" (
    "id" SERIAL NOT NULL,
    "mediaCatalogId" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_catalog_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_x_media_catalog_entry" (
    "productId" INTEGER NOT NULL,
    "mediaCatalogEntryId" INTEGER NOT NULL,

    CONSTRAINT "product_x_media_catalog_entry_pkey" PRIMARY KEY ("productId","mediaCatalogEntryId")
);

-- CreateTable
CREATE TABLE "production_chain_x_parameter" (
    "id" SERIAL NOT NULL,
    "productionChainId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "parameter_kind" NOT NULL,
    "defaultValue" TEXT,
    "options" JSONB,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "production_chain_x_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "producedByBatchId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_x_product" (
    "datasetId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dataset_x_product_pkey" PRIMARY KEY ("datasetId","productId")
);

-- CreateTable
CREATE TABLE "batch_x_dataset_in" (
    "batchId" INTEGER NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "batch_x_dataset_in_pkey" PRIMARY KEY ("batchId","datasetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_identifier_key" ON "project"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "product_type_acronym_key" ON "product_type"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "product_name_version_key" ON "product"("name", "version");

-- CreateIndex
CREATE INDEX "production_chain_projectId_idx" ON "production_chain"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "production_chain_projectId_name_key" ON "production_chain"("projectId", "name");

-- CreateIndex
CREATE INDEX "processing_chain_processingScriptId_idx" ON "processing_chain"("processingScriptId");

-- CreateIndex
CREATE UNIQUE INDEX "processing_chain_productionChainId_name_key" ON "processing_chain"("productionChainId", "name");

-- CreateIndex
CREATE INDEX "production_chain_x_edge_parentChainId_idx" ON "production_chain_x_edge"("parentChainId");

-- CreateIndex
CREATE INDEX "production_chain_x_edge_childChainId_idx" ON "production_chain_x_edge"("childChainId");

-- CreateIndex
CREATE UNIQUE INDEX "production_chain_x_edge_productionChainId_parentChainId_chi_key" ON "production_chain_x_edge"("productionChainId", "parentChainId", "childChainId");

-- CreateIndex
CREATE UNIQUE INDEX "processing_script_acronym_key" ON "processing_script"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "processing_script_defaultVersionId_key" ON "processing_script"("defaultVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "processing_script_version_processingScriptId_version_key" ON "processing_script_version"("processingScriptId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "processing_script_executable_processingScriptVersionId_stag_key" ON "processing_script_executable"("processingScriptVersionId", "stage", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliary_configuration_name_key" ON "auxiliary_configuration"("name");

-- CreateIndex
CREATE UNIQUE INDEX "processor_x_version_processingScriptVersionId_auxiliaryConf_key" ON "processor_x_version"("processingScriptVersionId", "auxiliaryConfigurationId");

-- CreateIndex
CREATE UNIQUE INDEX "task_executionTag_key" ON "task"("executionTag");

-- CreateIndex
CREATE INDEX "task_status_scheduledStartTime_idx" ON "task"("status", "scheduledStartTime");

-- CreateIndex
CREATE INDEX "task_projectId_status_idx" ON "task"("projectId", "status");

-- CreateIndex
CREATE INDEX "task_schedule_enabled_nextRunAt_idx" ON "task_schedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "task_schedule_projectId_idx" ON "task_schedule"("projectId");

-- CreateIndex
CREATE INDEX "batch_status_priority_idx" ON "batch"("status", "priority");

-- CreateIndex
CREATE INDEX "batch_executionTag_idx" ON "batch"("executionTag");

-- CreateIndex
CREATE INDEX "batch_projectId_status_idx" ON "batch"("projectId", "status");

-- CreateIndex
CREATE INDEX "job_status_hostId_idx" ON "job"("status", "hostId");

-- CreateIndex
CREATE INDEX "job_executionTag_idx" ON "job"("executionTag");

-- CreateIndex
CREATE INDEX "job_projectId_status_idx" ON "job"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pool_name_key" ON "pool"("name");

-- CreateIndex
CREATE UNIQUE INDEX "host_hostname_key" ON "host"("hostname");

-- CreateIndex
CREATE INDEX "host_log_hostId_loggedAt_idx" ON "host_log"("hostId", "loggedAt" DESC);

-- CreateIndex
CREATE INDEX "host_log_jobId_loggedAt_idx" ON "host_log"("jobId", "loggedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_keycloakSub_key" ON "user"("keycloakSub");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "data_center_code_key" ON "data_center"("code");

-- CreateIndex
CREATE UNIQUE INDEX "job_x_allocation_jobId_key" ON "job_x_allocation"("jobId");

-- CreateIndex
CREATE INDEX "job_x_allocation_hostId_releasedAt_idx" ON "job_x_allocation"("hostId", "releasedAt");

-- CreateIndex
CREATE INDEX "host_metrics_hostId_sampledAt_idx" ON "host_metrics"("hostId", "sampledAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_x_ingestion_hook_productTypeId_productionChainId_key" ON "product_x_ingestion_hook"("productTypeId", "productionChainId");

-- CreateIndex
CREATE UNIQUE INDEX "media_name_key" ON "media"("name");

-- CreateIndex
CREATE UNIQUE INDEX "media_catalog_mediaId_name_key" ON "media_catalog"("mediaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "media_catalog_entry_mediaCatalogId_path_key" ON "media_catalog_entry"("mediaCatalogId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "production_chain_x_parameter_productionChainId_name_key" ON "production_chain_x_parameter"("productionChainId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_producedByBatchId_key" ON "dataset"("producedByBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_x_product_datasetId_role_sequence_key" ON "dataset_x_product"("datasetId", "role", "sequence");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_product_type" ADD CONSTRAINT "production_chain_x_product_type_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_product_type" ADD CONSTRAINT "production_chain_x_product_type_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain" ADD CONSTRAINT "production_chain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_chain" ADD CONSTRAINT "processing_chain_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_chain" ADD CONSTRAINT "processing_chain_processingScriptId_fkey" FOREIGN KEY ("processingScriptId") REFERENCES "processing_script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_edge" ADD CONSTRAINT "production_chain_x_edge_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_edge" ADD CONSTRAINT "production_chain_x_edge_parentChainId_fkey" FOREIGN KEY ("parentChainId") REFERENCES "processing_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_edge" ADD CONSTRAINT "production_chain_x_edge_childChainId_fkey" FOREIGN KEY ("childChainId") REFERENCES "processing_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_script" ADD CONSTRAINT "processing_script_defaultVersionId_fkey" FOREIGN KEY ("defaultVersionId") REFERENCES "processing_script_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_script_version" ADD CONSTRAINT "processing_script_version_processingScriptId_fkey" FOREIGN KEY ("processingScriptId") REFERENCES "processing_script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_script_executable" ADD CONSTRAINT "processing_script_executable_processingScriptVersionId_fkey" FOREIGN KEY ("processingScriptVersionId") REFERENCES "processing_script_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processor_x_version" ADD CONSTRAINT "processor_x_version_processingScriptVersionId_fkey" FOREIGN KEY ("processingScriptVersionId") REFERENCES "processing_script_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processor_x_version" ADD CONSTRAINT "processor_x_version_auxiliaryConfigurationId_fkey" FOREIGN KEY ("auxiliaryConfigurationId") REFERENCES "auxiliary_configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_processorVersionId_fkey" FOREIGN KEY ("processorVersionId") REFERENCES "processor_x_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_inputDatasetId_fkey" FOREIGN KEY ("inputDatasetId") REFERENCES "dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_processingChainId_fkey" FOREIGN KEY ("processingChainId") REFERENCES "processing_chain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_processorVersionId_fkey" FOREIGN KEY ("processorVersionId") REFERENCES "processor_x_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_processingScriptVersionId_fkey" FOREIGN KEY ("processingScriptVersionId") REFERENCES "processing_script_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_processorVersionId_fkey" FOREIGN KEY ("processorVersionId") REFERENCES "processor_x_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_x_host" ADD CONSTRAINT "pool_x_host_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_x_host" ADD CONSTRAINT "pool_x_host_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host" ADD CONSTRAINT "host_dataCenterId_fkey" FOREIGN KEY ("dataCenterId") REFERENCES "data_center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_log" ADD CONSTRAINT "host_log_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_log" ADD CONSTRAINT "host_log_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_lastProjectId_fkey" FOREIGN KEY ("lastProjectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_x_allocation" ADD CONSTRAINT "job_x_allocation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_x_allocation" ADD CONSTRAINT "job_x_allocation_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_metrics" ADD CONSTRAINT "host_metrics_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_x_ingestion_hook" ADD CONSTRAINT "product_x_ingestion_hook_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_x_ingestion_hook" ADD CONSTRAINT "product_x_ingestion_hook_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_x_ingestion_hook" ADD CONSTRAINT "product_x_ingestion_hook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_catalog" ADD CONSTRAINT "media_catalog_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_catalog_entry" ADD CONSTRAINT "media_catalog_entry_mediaCatalogId_fkey" FOREIGN KEY ("mediaCatalogId") REFERENCES "media_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_x_media_catalog_entry" ADD CONSTRAINT "product_x_media_catalog_entry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_x_media_catalog_entry" ADD CONSTRAINT "product_x_media_catalog_entry_mediaCatalogEntryId_fkey" FOREIGN KEY ("mediaCatalogEntryId") REFERENCES "media_catalog_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_chain_x_parameter" ADD CONSTRAINT "production_chain_x_parameter_productionChainId_fkey" FOREIGN KEY ("productionChainId") REFERENCES "production_chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_producedByBatchId_fkey" FOREIGN KEY ("producedByBatchId") REFERENCES "batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_x_product" ADD CONSTRAINT "dataset_x_product_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_x_product" ADD CONSTRAINT "dataset_x_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_x_dataset_in" ADD CONSTRAINT "batch_x_dataset_in_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_x_dataset_in" ADD CONSTRAINT "batch_x_dataset_in_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
