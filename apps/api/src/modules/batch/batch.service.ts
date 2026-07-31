import { PrismaService } from '@/core/prisma';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { BatchListQuery } from './batch.dto';

// Columns the batch list may be sorted by (real Batch scalar fields only —
// computed values like co2/duration can't be ordered in the DB).
const BATCH_SORTABLE = [
  'createdAt',
  'scheduledAt',
  'startedAt',
  'endedAt',
  'status',
  'kind',
  'priority',
  'executionTag',
  'updatedAt',
  'id',
] as const;
import {
  Batch,
  type BatchStatusSummary,
  CreateBatchRequest,
  CreateChainBatch,
  CreateStandaloneBatch,
  type Co2Concern,
  type TransferSource,
  type HostLog,
  type HostLogLevel,
} from '@dpmc/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@dpmc/prisma';
import type { UpdateBatchPriorityBody } from './batch.dto';
import { toHostLogDto } from '@/modules/host/host.utils';
import { randomUUID } from 'crypto';

type BatchEnergyMetrics = {
  co2Grams: number | null;
  energyWh: number | null;
  totalDurationMs: number | null;
  co2GramsByConcern: Co2Concern | null;
  energyWhByConcern: Co2Concern | null;
  transferSource: TransferSource | null;
  transferSourceMixed: boolean;
};

const EMPTY_BATCH_METRICS: BatchEnergyMetrics = {
  co2Grams: null,
  energyWh: null,
  totalDurationMs: null,
  co2GramsByConcern: null,
  energyWhByConcern: null,
  transferSource: null,
  transferSourceMixed: false,
};

const round4 = (value: number): number => Number(Number(value).toFixed(4));

type EnrichedBatch = Batch & BatchEnergyMetrics;

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    projectId: number,
    query?: BatchListQuery,
  ): Promise<PaginatedResult<Batch>> {
    const p = query ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['executionTag'], p.q);
    const where = {
      projectId,
      ...(query?.status?.length ? { status: { in: query.status } } : {}),
      ...(query?.kind?.length ? { kind: { in: query.kind } } : {}),
      ...(search ?? {}),
    };
    // Default: newest-created first (id desc breaks ties for stable pagination);
    // overridable via ?sort=&order= against the BATCH_SORTABLE allowlist.
    const orderBy = buildOrderBy(BATCH_SORTABLE, query?.sort, query?.order, [
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({ where, skip, take, orderBy }),
      this.prisma.batch.count({ where }),
    ]);
    const metrics = await this.computeBatchMetricsMany(items.map((b) => b.id));
    return {
      items: items.map((b) => ({
        ...b,
        co2Grams: metrics.get(b.id)?.co2Grams ?? null,
        totalDurationMs: metrics.get(b.id)?.totalDurationMs ?? null,
      })),
      total,
    };
  }

  async getById(id: number, projectId: number): Promise<EnrichedBatch> {
    const batch = await this.prisma.batch.findFirst({
      where: { id, projectId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }
    const metrics = await this.computeBatchMetrics(id);
    return { ...batch, ...metrics };
  }

  async statusSummary(projectId: number): Promise<BatchStatusSummary> {
    // Mirrors the list() where-clause (projectId only; batch has no soft-delete
    // filtering in this module), so the summary counts match the list.
    const rows = await this.prisma.batch.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { _all: true },
    });
    const out: BatchStatusSummary = {
      Pending: 0,
      Running: 0,
      Success: 0,
      Failed: 0,
      Cancelled: 0,
    };
    for (const r of rows) {
      out[r.status] = r._count._all;
    }
    return out;
  }

  /**
   * Products produced by this batch — what stage-out registered through
   * `recordOutputs`. Each product carries a short-lived presigned HTTPS URL
   * so the UI can render previews without the bucket being public.
   * Project-scoped.
   */
  async listProducts(id: number, projectId: number) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    const products = await this.prisma.product.findMany({
      where: { parentBatchId: id },
      orderBy: { createdAt: 'asc' },
    });
    return products.map((p) => ({ ...p, previewUrl: null }));
  }

  /**
   * Batch-scoped host log feed. Returns IPF stdout/stderr across whichever
   * host(s) executed the batch's jobs, ordered DESC by `loggedAt`.
   * Cursor pagination via `before`; default page size 200, capped at 500.
   * Project-scoped (404 if the batch isn't in the requesting project).
   */
  async listLogs(
    id: number,
    projectId: number,
    options: { limit?: number; before?: Date; level?: HostLogLevel },
  ): Promise<{ logs: HostLog[]; nextBefore: Date | null }> {
    const batch = await this.prisma.batch.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);

    const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
    const before = options.before ?? new Date('9999-12-31T23:59:59Z');

    const rows = await this.prisma.hostLog.findMany({
      where: {
        loggedAt: { lt: before },
        ...(options.level ? { level: options.level } : {}),
        job: { batchId: id },
      },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });

    const logs: HostLog[] = rows.map(toHostLogDto);
    const nextBefore =
      logs.length === limit ? logs[logs.length - 1].loggedAt : null;
    return { logs, nextBefore };
  }

  /**
   * Products consumed by this batch as inputs. Resolved from the
   * `BatchDatasetIn` graph: each linked Dataset contributes its
   * `DatasetProduct` rows (in declared sequence), exposing each Product's
   * id/name/type acronym. The bytes themselves are fetched by the processing
   * script from the product's media graph, so the UI only needs metadata —
   * no flattened URL. Project-scoped.
   */
  async listInputs(id: number, projectId: number) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);

    const ins = await this.prisma.batchDatasetIn.findMany({
      where: { batchId: id },
      orderBy: { sequence: 'asc' },
      include: {
        dataset: {
          include: {
            products: {
              orderBy: { sequence: 'asc' },
              include: {
                product: {
                  include: {
                    productType: { select: { acronym: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return ins.flatMap(({ dataset }) =>
      dataset.products.map(({ role, product }) => ({
        role,
        productId: product.id,
        productName: product.name,
        productType: product.productType.acronym,
      })),
    );
  }

  /**
   * Per-batch job listing for the detail page. Includes lastError + exit
   * code so the UI can surface failure reasons without a second roundtrip.
   * Project-scoped: throws 404 if the batch isn't in the current project.
   */
  async listJobs(id: number, projectId: number) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    const jobs = await this.prisma.job.findMany({
      where: { batchId: id },
      select: {
        id: true,
        status: true,
        hostId: true,
        lastError: true,
        metrics: true,
        attempt: true,
        startedAt: true,
        endedAt: true,
        host: { select: { hostname: true } },
        processingScriptVersion: {
          select: {
            processingScript: { select: { acronym: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return jobs.map((j) => {
      let exitCode: number | null = null;
      if (
        j.metrics &&
        typeof j.metrics === 'object' &&
        !Array.isArray(j.metrics)
      ) {
        const m = j.metrics as Record<string, unknown>;
        if (typeof m.exitCode === 'number') exitCode = m.exitCode;
      }
      return {
        id: j.id,
        status: j.status,
        hostId: j.hostId,
        hostname: j.host?.hostname ?? null,
        acronym: j.processingScriptVersion.processingScript.acronym,
        scriptName: j.processingScriptVersion.processingScript.name,
        lastError: j.lastError,
        exitCode,
        attempt: j.attempt,
        startedAt: j.startedAt,
        endedAt: j.endedAt,
      };
    });
  }

  async create(projectId: number, dto: CreateBatchRequest): Promise<Batch> {
    if (dto.kind === 'Chain') {
      return this.createChainBatch(projectId, dto);
    }
    return this.createStandaloneBatch(projectId, dto);
  }

  async updatePriority(
    id: number,
    projectId: number,
    dto: UpdateBatchPriorityBody,
  ): Promise<Batch> {
    const existing = await this.prisma.batch.findFirst({
      where: { id, projectId },
    });
    if (!existing) throw new NotFoundException(`Batch ${id} not found`);
    return this.prisma.batch.update({
      where: { id },
      data: {
        priority: dto.priority,
        priorityClass: dto.class,
      },
    });
  }

  async replay(id: number, projectId: number): Promise<Batch> {
    const parent = await this.prisma.batch.findFirst({
      where: { id, projectId },
      include: { jobs: true },
    });
    if (!parent) {
      throw new NotFoundException(`Batch ${id} not found`);
    }
    if (parent.status !== 'Failed' && parent.status !== 'Cancelled') {
      throw new BadRequestException(
        `Only Failed or Cancelled batches can be replayed (current: ${parent.status}).`,
      );
    }

    const batchProjectId = parent.projectId;
    const executionTag = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // Replay creates a fresh high-level Task that owns the new batch.
      // Task.parameters carries over the parent Batch's `parametersIn`
      // (the legacy `input` JSON now lives there).
      const task = await tx.task.create({
        data: {
          projectId: batchProjectId,
          kind: parent.kind,
          productionChainId: null,
          processorVersionId: parent.processorVersionId,
          executionTag,
          status: 'Queued',
          productionMode: parent.productionMode,
          priorityClass: parent.priorityClass,
          scheduledStartTime: parent.scheduledAt ?? new Date(),
          priority: parent.priority,
          parameters:
            parent.parametersIn === null
              ? Prisma.JsonNull
              : (parent.parametersIn as Prisma.InputJsonValue),
        },
      });

      const replay = await tx.batch.create({
        data: {
          projectId: batchProjectId,
          taskId: task.id,
          productionChainId: parent.productionChainId,
          processorVersionId: parent.processorVersionId,
          parentBatchId: parent.id,
          poolId: parent.poolId,
          executionTag,
          kind: parent.kind,
          priority: parent.priority,
          priorityClass: parent.priorityClass,
          productionMode: parent.productionMode,
          parametersIn:
            parent.parametersIn === null
              ? Prisma.JsonNull
              : (parent.parametersIn as Prisma.InputJsonValue),
          constraints:
            parent.constraints === null
              ? Prisma.JsonNull
              : (parent.constraints as Prisma.InputJsonValue),
          configuration:
            parent.configuration === null
              ? Prisma.JsonNull
              : (parent.configuration as Prisma.InputJsonValue),
          parameters:
            parent.parameters === null
              ? Prisma.JsonNull
              : (parent.parameters as Prisma.InputJsonValue),
        },
      });

      // Empty datasetOut for the new Batch — ProcessingChain.outputs is the
      // runtime source of truth, the replay just gets a fresh container.
      await tx.dataset.create({
        data: {
          producedByBatchId: replay.id,
          name: `batch:${replay.id}:out`,
        },
      });

      // Clone BatchDatasetIn rows so the replay reads the same input
      // Datasets as the parent (no need to copy Products themselves).
      const sourceIns = await tx.batchDatasetIn.findMany({
        where: { batchId: parent.id },
        orderBy: { sequence: 'asc' },
        select: { datasetId: true, sequence: true },
      });
      for (const si of sourceIns) {
        await tx.batchDatasetIn.create({
          data: {
            batchId: replay.id,
            datasetId: si.datasetId,
            sequence: si.sequence,
          },
        });
      }

      // Recreate the same Jobs (one per parent Job), reset to Waiting.
      // Successful parent jobs are skipped — their artifacts are reused at execution.
      for (const j of parent.jobs) {
        const reuse = j.status === 'Success';
        await tx.job.create({
          data: {
            projectId: batchProjectId,
            batchId: replay.id,
            processingScriptVersionId: j.processingScriptVersionId,
            executionTag,
            status: reuse ? 'Success' : 'Waiting',
            parameters:
              j.parameters === null
                ? Prisma.JsonNull
                : (j.parameters as Prisma.InputJsonValue),
            outputDir: reuse ? j.outputDir : null,
          },
        });
      }

      return replay;
    });
  }

  // -- Carbon / duration metrics (derived from jobs, not stored) --

  async computeBatchMetricsMany(
    batchIds: number[],
  ): Promise<Map<number, BatchEnergyMetrics>> {
    const out = new Map<number, BatchEnergyMetrics>();
    if (batchIds.length === 0) return out;

    for (const id of batchIds) {
      out.set(id, EMPTY_BATCH_METRICS);
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        batch_id: number;
        co2_grams: number;
        energy_wh: number;
        duration_ms: number;
        timed_job_count: bigint;
        transfer_source: TransferSource | null;
        transfer_source_count: bigint;
        cpu_co2_grams: number;
        gpu_co2_grams: number;
        ingress_co2_grams: number;
        egress_co2_grams: number;
        cpu_wh: number;
        gpu_wh: number;
        ingress_wh: number;
        egress_wh: number;
      }>
    >(Prisma.sql`
      SELECT batch_id,
             co2_grams::float8         AS co2_grams,
             energy_wh::float8         AS energy_wh,
             duration_ms::float8       AS duration_ms,
             timed_job_count,
             transfer_source,
             transfer_source_count,
             cpu_co2_grams::float8     AS cpu_co2_grams,
             gpu_co2_grams::float8     AS gpu_co2_grams,
             ingress_co2_grams::float8 AS ingress_co2_grams,
             egress_co2_grams::float8  AS egress_co2_grams,
             cpu_wh::float8            AS cpu_wh,
             gpu_wh::float8            AS gpu_wh,
             ingress_wh::float8        AS ingress_wh,
             egress_wh::float8         AS egress_wh
      FROM "batch_energy"
      WHERE batch_id IN (${Prisma.join(batchIds)})
    `);

    for (const row of rows) {
      // Nothing ran yet → null, not 0; the console renders them differently.
      const hasRun = Number(row.timed_job_count) > 0;

      if (!hasRun) continue;

      out.set(row.batch_id, {
        co2Grams: round4(row.co2_grams),
        energyWh: round4(row.energy_wh),
        totalDurationMs: Math.round(Number(row.duration_ms)),
        co2GramsByConcern: {
          cpu: round4(row.cpu_co2_grams),
          gpu: round4(row.gpu_co2_grams),
          ingress: round4(row.ingress_co2_grams),
          egress: round4(row.egress_co2_grams),
        },
        energyWhByConcern: {
          cpu: round4(row.cpu_wh),
          gpu: round4(row.gpu_wh),
          ingress: round4(row.ingress_wh),
          egress: round4(row.egress_wh),
        },
        transferSource: row.transfer_source,
        transferSourceMixed: Number(row.transfer_source_count) > 1,
      });
    }

    return out;
  }

  async computeBatchMetrics(batchId: number): Promise<BatchEnergyMetrics> {
    const metrics = await this.computeBatchMetricsMany([batchId]);
    return metrics.get(batchId) ?? EMPTY_BATCH_METRICS;
  }

  // -- Internal creators --

  private async createChainBatch(
    projectId: number,
    dto: CreateChainBatch,
  ): Promise<Batch> {
    const chainId = dto.productionChainId;
    if (!chainId) {
      throw new BadRequestException('Chain batch requires productionChainId.');
    }

    const chain = await this.prisma.productionChain.findUnique({
      where: { id: chainId },
      select: { id: true },
    });
    if (!chain) {
      throw new NotFoundException(`ProductionChain ${chainId} not found`);
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, isActive: true },
      select: { id: true, allowedProductionModes: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (!project.allowedProductionModes.includes(dto.productionMode)) {
      throw new UnprocessableEntityException(
        `Production mode ${dto.productionMode} is not allowed for project ${project.id}`,
      );
    }
    const executionTag = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId,
          kind: 'Chain',
          productionChainId: chainId,
          executionTag,
          status: 'Queued',
          productionMode: dto.productionMode,
          priorityClass: dto.priorityClass ?? 'OnDemand',
          scheduledStartTime: dto.scheduledAt ?? new Date(),
          priority: dto.priority,
          parameters:
            dto.input === undefined
              ? Prisma.JsonNull
              : (dto.input as Prisma.InputJsonValue),
        },
      });
      return tx.batch.create({
        data: {
          projectId,
          taskId: task.id,
          productionChainId: chainId,
          executionTag,
          kind: 'Chain',
          priority: dto.priority,
          priorityClass: dto.priorityClass ?? 'OnDemand',
          productionMode: dto.productionMode,
          scheduledAt: dto.scheduledAt ?? null,
          parametersIn:
            dto.input === undefined
              ? Prisma.JsonNull
              : (dto.input as Prisma.InputJsonValue),
          constraints:
            dto.constraints === undefined
              ? Prisma.JsonNull
              : (dto.constraints as Prisma.InputJsonValue),
          configuration:
            dto.configuration === undefined
              ? Prisma.JsonNull
              : (dto.configuration as Prisma.InputJsonValue),
          poolId: dto.poolId ?? null,
        },
      });
    });
  }

  private async createStandaloneBatch(
    projectId: number,
    dto: CreateStandaloneBatch,
  ): Promise<Batch> {
    const { processorVersionId, processingScriptVersionId } =
      await this.resolveProcessorVersion(dto);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, isActive: true },
      select: { id: true, allowedProductionModes: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (!project.allowedProductionModes.includes(dto.productionMode)) {
      throw new UnprocessableEntityException(
        `Production mode ${dto.productionMode} is not allowed for project ${project.id}`,
      );
    }
    const executionTag = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId,
          kind: 'Standalone',
          processorVersionId,
          executionTag,
          status: 'Queued',
          productionMode: dto.productionMode,
          priorityClass: dto.priorityClass ?? 'OnDemand',
          scheduledStartTime: dto.scheduledAt ?? new Date(),
          priority: dto.priority,
          parameters:
            dto.input === undefined
              ? Prisma.JsonNull
              : (dto.input as Prisma.InputJsonValue),
        },
      });
      const batch = await tx.batch.create({
        data: {
          projectId,
          taskId: task.id,
          processorVersionId,
          executionTag,
          kind: 'Standalone',
          priority: dto.priority,
          priorityClass: dto.priorityClass ?? 'OnDemand',
          productionMode: dto.productionMode,
          scheduledAt: dto.scheduledAt ?? null,
          parametersIn:
            dto.input === undefined
              ? Prisma.JsonNull
              : (dto.input as Prisma.InputJsonValue),
          constraints:
            dto.constraints === undefined
              ? Prisma.JsonNull
              : (dto.constraints as Prisma.InputJsonValue),
          configuration:
            dto.configuration === undefined
              ? Prisma.JsonNull
              : (dto.configuration as Prisma.InputJsonValue),
          poolId: dto.poolId ?? null,
        },
      });
      await tx.job.create({
        data: {
          projectId,
          batchId: batch.id,
          processingScriptVersionId,
          executionTag,
          status: 'Ready',
          parameters:
            dto.input === undefined
              ? Prisma.JsonNull
              : (dto.input as Prisma.InputJsonValue),
        },
      });
      return batch;
    });
  }

  /**
   * Resolves the ProcessorVersion (SXAC) to attach to the batch and the
   * underlying ProcessingScriptVersion used to spawn the Job.
   *
   * MVP behaviour:
   * - If `processorVersionId` is provided, validate FK and use it.
   * - Otherwise (legacy path) accept `processingScriptVersionId` /
   *   `processingScriptId` to derive a ProcessingScriptVersion. In that
   *   case `processorVersionId` is left null on the batch (the
   *   ProcessorVersion module will populate it later in Phase 4).
   */
  private async resolveProcessorVersion(dto: CreateStandaloneBatch): Promise<{
    processorVersionId: number | null;
    processingScriptVersionId: number;
  }> {
    if (dto.processorVersionId) {
      const pv = await this.prisma.processorVersion.findUnique({
        where: { id: dto.processorVersionId },
        select: { id: true, processingScriptVersionId: true },
      });
      if (!pv) {
        throw new NotFoundException(
          `ProcessorVersion ${dto.processorVersionId} not found`,
        );
      }
      return {
        processorVersionId: pv.id,
        processingScriptVersionId: pv.processingScriptVersionId,
      };
    }

    const hasVersion = Boolean(dto.processingScriptVersionId);
    const hasScript = Boolean(dto.processingScriptId);
    if (hasVersion === hasScript) {
      throw new BadRequestException(
        'Standalone batch requires processorVersionId, or exactly one of processingScriptVersionId / processingScriptId.',
      );
    }

    if (hasVersion) {
      const v = await this.prisma.processingScriptVersion.findUnique({
        where: { id: dto.processingScriptVersionId! },
        select: { id: true },
      });
      if (!v) {
        throw new NotFoundException(
          `ProcessingScriptVersion ${dto.processingScriptVersionId} not found`,
        );
      }
      return { processorVersionId: null, processingScriptVersionId: v.id };
    }

    const script = await this.prisma.processingScript.findUnique({
      where: { id: dto.processingScriptId! },
      select: { defaultVersionId: true },
    });
    if (!script) {
      throw new NotFoundException(
        `ProcessingScript ${dto.processingScriptId} not found`,
      );
    }
    if (!script.defaultVersionId) {
      throw new BadRequestException(
        `ProcessingScript ${dto.processingScriptId} has no default version. Provide processingScriptVersionId explicitly.`,
      );
    }
    return {
      processorVersionId: null,
      processingScriptVersionId: script.defaultVersionId,
    };
  }
}
