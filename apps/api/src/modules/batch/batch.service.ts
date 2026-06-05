import { PrismaService } from '@/core/prisma';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { BatchListQuery } from './batch.dto';
import {
  Batch,
  CreateBatchRequest,
  CreateChainBatch,
  CreateStandaloneBatch,
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

type EnrichedBatch = Batch & {
  co2Grams: number | null;
  totalDurationMs: number | null;
};

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
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.kind ? { kind: query.kind } : {}),
      ...(search ?? {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({ where, skip, take }),
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
  ): Promise<
    Map<number, { co2Grams: number | null; totalDurationMs: number | null }>
  > {
    const out = new Map<
      number,
      { co2Grams: number | null; totalDurationMs: number | null }
    >();
    if (batchIds.length === 0) return out;

    const jobs = await this.prisma.job.findMany({
      where: { batchId: { in: batchIds } },
      select: {
        batchId: true,
        startedAt: true,
        endedAt: true,
        avgPower: true,
        host: { include: { dataCenter: true } },
      },
    });

    for (const id of batchIds) {
      out.set(id, { co2Grams: null, totalDurationMs: null });
    }
    const accum = new Map<
      number,
      { co2: number; duration: number; any: boolean }
    >();
    for (const job of jobs) {
      const start = job.startedAt?.getTime();
      const end = job.endedAt?.getTime();
      if (!start || !end || end <= start) continue;
      const ms = end - start;
      const acc = accum.get(job.batchId) ?? { co2: 0, duration: 0, any: false };
      acc.duration += ms;
      acc.any = true;
      const dc = job.host?.dataCenter;
      if (job.avgPower && dc) {
        const hours = ms / 3_600_000;
        acc.co2 += (job.avgPower * hours * dc.pue * dc.emissionFactor) / 1000;
      }
      accum.set(job.batchId, acc);
    }
    for (const [id, a] of accum) {
      out.set(id, {
        co2Grams: a.any ? Number(a.co2.toFixed(4)) : null,
        totalDurationMs: a.any ? a.duration : null,
      });
    }
    return out;
  }

  async computeBatchMetrics(batchId: number): Promise<{
    co2Grams: number | null;
    totalDurationMs: number | null;
  }> {
    const jobs = await this.prisma.job.findMany({
      where: { batchId },
      include: {
        host: { include: { dataCenter: true } },
      },
    });

    if (jobs.length === 0) {
      return { co2Grams: null, totalDurationMs: null };
    }

    let co2Sum = 0;
    let durationSum = 0;
    let anyMetric = false;

    for (const job of jobs) {
      const start = job.startedAt?.getTime();
      const end = job.endedAt?.getTime();
      if (start && end && end > start) {
        const ms = end - start;
        durationSum += ms;
        anyMetric = true;
        const dc = job.host?.dataCenter;
        if (job.avgPower && dc) {
          // co2 (g) = avgPower(W) * hours * pue * emissionFactor(gCO2/kWh) / 1000
          const hours = ms / 3_600_000;
          co2Sum += (job.avgPower * hours * dc.pue * dc.emissionFactor) / 1000;
        }
      }
    }

    return {
      co2Grams: anyMetric ? Number(co2Sum.toFixed(4)) : null,
      totalDurationMs: anyMetric ? durationSum : null,
    };
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
