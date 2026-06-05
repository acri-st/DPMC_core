import { PrismaService } from '@/core/prisma';
import { S3Service } from '@/core/s3';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { TaskListQuery } from './task.dto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ExecutionTree,
  Task,
  TaskHistoryEntry,
  TaskStatusSummary,
} from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import { randomUUID } from 'crypto';
import type {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskPriorityBody,
} from './task.dto';
import { taskToDto } from './task.utils';
import { mergeParametersIn, loadChainParamDefaults } from './parameters.utils';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async list(
    projectId: number,
    query?: TaskListQuery,
  ): Promise<PaginatedResult<Task>> {
    const p = query ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['executionTag', 'comment'], p.q);
    const where = {
      projectId,
      deletedAt: null,
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.kind ? { kind: query.kind } : {}),
      ...(search ?? {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledStartTime: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items: records.map(taskToDto), total };
  }

  async getById(id: number, projectId: number): Promise<Task> {
    const record = await this.prisma.task.findFirst({
      where: { id, projectId, deletedAt: null },
    });
    if (!record) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return taskToDto(record);
  }

  async create(projectId: number, dto: CreateTaskBody): Promise<Task> {
    // Validate FKs
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
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

    if (dto.kind === 'Chain') {
      const chain = await this.prisma.productionChain.findFirst({
        where: { id: dto.productionChainId, deletedAt: null },
        select: { id: true },
      });
      if (!chain) {
        throw new NotFoundException(
          `ProductionChain ${dto.productionChainId} not found`,
        );
      }
      if (dto.processorVersionId) {
        await this.assertProcessorVersionExists(dto.processorVersionId);
      }
    } else {
      // Standalone
      await this.assertProcessorVersionExists(dto.processorVersionId);
      if (dto.productionChainId) {
        const chain = await this.prisma.productionChain.findFirst({
          where: { id: dto.productionChainId, deletedAt: null },
          select: { id: true },
        });
        if (!chain) {
          throw new NotFoundException(
            `ProductionChain ${dto.productionChainId} not found`,
          );
        }
      }
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${dto.productId} not found`);
      }
    }

    if (dto.inputDatasetId) {
      const dataset = await this.prisma.dataset.findUnique({
        where: { id: dto.inputDatasetId },
        select: { id: true },
      });
      if (!dataset) {
        throw new NotFoundException(`Dataset ${dto.inputDatasetId} not found`);
      }
    }

    const created = await this.prisma.task.create({
      data: {
        projectId,
        kind: dto.kind,
        productionChainId: dto.productionChainId ?? null,
        processorVersionId: dto.processorVersionId ?? null,
        productId: dto.productId ?? null,
        inputDatasetId: dto.inputDatasetId ?? null,
        executionTag: randomUUID(),
        status: 'Edited',
        priority: dto.priority ?? 0,
        productionMode: dto.productionMode,
        priorityClass: dto.priorityClass ?? 'OnDemand',
        scheduledStartTime: dto.scheduledStartTime,
        expectedStartTime: dto.expectedStartTime ?? null,
        temporalContext:
          dto.temporalContext === undefined || dto.temporalContext === null
            ? Prisma.JsonNull
            : (dto.temporalContext as Prisma.InputJsonValue),
        parameters:
          dto.parameters === undefined || dto.parameters === null
            ? Prisma.JsonNull
            : (dto.parameters as Prisma.InputJsonValue),
        comment: dto.comment ?? null,
      },
    });
    return taskToDto(created);
  }

  async update(
    id: number,
    projectId: number,
    dto: UpdateTaskBody,
  ): Promise<Task> {
    await this.getById(id, projectId);
    if (dto.processorVersionId) {
      await this.assertProcessorVersionExists(dto.processorVersionId);
    }
    if (dto.productionChainId) {
      const chain = await this.prisma.productionChain.findFirst({
        where: { id: dto.productionChainId, deletedAt: null },
        select: { id: true },
      });
      if (!chain) {
        throw new NotFoundException(
          `ProductionChain ${dto.productionChainId} not found`,
        );
      }
    }
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${dto.productId} not found`);
      }
    }
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        priority: dto.priority,
        scheduledStartTime: dto.scheduledStartTime,
        expectedStartTime: dto.expectedStartTime,
        temporalContext:
          dto.temporalContext === undefined
            ? undefined
            : dto.temporalContext === null
              ? Prisma.JsonNull
              : (dto.temporalContext as Prisma.InputJsonValue),
        parameters:
          dto.parameters === undefined
            ? undefined
            : dto.parameters === null
              ? Prisma.JsonNull
              : (dto.parameters as Prisma.InputJsonValue),
        comment: dto.comment,
        productId: dto.productId,
        productionChainId: dto.productionChainId,
        processorVersionId: dto.processorVersionId,
      },
    });
    return taskToDto(updated);
  }

  async updatePriority(
    id: number,
    projectId: number,
    dto: UpdateTaskPriorityBody,
  ): Promise<Task> {
    await this.getById(id, projectId); // throws if not found
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        priority: dto.priority,
        priorityClass: dto.class,
      },
    });
    return taskToDto(updated);
  }

  async delete(id: number, projectId: number): Promise<void> {
    await this.getById(id, projectId);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async trigger(id: number, projectId: number): Promise<Task> {
    const task = await this.getById(id, projectId);
    if (task.status !== 'Edited') {
      throw new BadRequestException(
        `Task ${id} cannot be triggered from status ${task.status}`,
      );
    }
    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'Queued' },
    });
    return taskToDto(updated);
  }

  async expandFromScheduler(id: number): Promise<Task> {
    const owner = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { projectId: true },
    });
    if (!owner) throw new NotFoundException(`Task ${id} not found`);
    return this.expand(id, owner.projectId);
  }

  async expand(id: number, projectId: number): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId, deletedAt: null },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.status !== 'Edited' && task.status !== 'Queued') {
      throw new BadRequestException(
        `Task ${id} cannot be expanded from status ${task.status}`,
      );
    }

    if (task.kind === 'Standalone') {
      if (!task.processorVersionId) {
        throw new BadRequestException(
          `Standalone task ${id} has no processorVersionId`,
        );
      }
      const pv = await this.prisma.processorVersion.findUnique({
        where: { id: task.processorVersionId },
        select: {
          id: true,
          processingScriptVersionId: true,
        },
      });
      if (!pv) {
        throw new NotFoundException(
          `ProcessorVersion ${task.processorVersionId} not found`,
        );
      }

      // Build the task input Dataset from task.productId (+ optional
      // stageProducts from task.parameters). The output dataset is created
      // empty here and filled in later by WorkerService.recordOutputs.
      const stageProductIds: number[] = [];
      if (task.parameters && typeof task.parameters === 'object') {
        const params = task.parameters as Record<string, unknown>;
        if (Array.isArray(params.stageProducts)) {
          stageProductIds.push(
            ...params.stageProducts.filter(
              (s: unknown): s is number => typeof s === 'number',
            ),
          );
        }
      }

      const inputProductIds: Array<{ productId: number; role: string }> = [];
      if (task.productId)
        inputProductIds.push({ productId: task.productId, role: 'input' });
      for (const spId of stageProductIds)
        inputProductIds.push({ productId: spId, role: 'aux' });

      const executionTag = randomUUID();
      await this.prisma.$transaction(async (tx) => {
        // Reuse Task.inputDatasetId if provided, else create one from the
        // products above.
        let taskInputDatasetId: number | null = task.inputDatasetId ?? null;
        if (!taskInputDatasetId && inputProductIds.length > 0) {
          const created = await tx.dataset.create({
            data: {
              name: `task:${task.id}:input`,
              products: {
                create: inputProductIds.map((p, i) => ({
                  productId: p.productId,
                  role: p.role,
                  sequence: i,
                })),
              },
            },
            select: { id: true },
          });
          taskInputDatasetId = created.id;
        }

        const batch = await tx.batch.create({
          data: {
            projectId: task.projectId,
            taskId: task.id,
            processorVersionId: pv.id,
            executionTag,
            kind: 'Standalone',
            priority: task.priority,
            productionMode: task.productionMode,
            priorityClass: task.priorityClass,
            parametersIn:
              task.parameters === null
                ? Prisma.JsonNull
                : (task.parameters as Prisma.InputJsonValue),
          },
        });

        // Empty datasetOut; populated by WorkerService.recordOutputs.
        await tx.dataset.create({
          data: { producedByBatchId: batch.id, name: `batch:${batch.id}:out` },
        });

        // Link the input dataset (if any).
        if (taskInputDatasetId) {
          await tx.batchDatasetIn.create({
            data: {
              batchId: batch.id,
              datasetId: taskInputDatasetId,
              sequence: 0,
            },
          });
        }

        await tx.job.create({
          data: {
            projectId: task.projectId,
            batchId: batch.id,
            processingScriptVersionId: pv.processingScriptVersionId,
            processorVersionId: pv.id,
            executionTag,
            status: 'Ready',
          },
        });
      });
      const reloaded = await this.prisma.task.findFirstOrThrow({
        where: { id, deletedAt: null },
      });
      return taskToDto(reloaded);
    }

    // Chain
    if (!task.productionChainId) {
      throw new BadRequestException(
        `Chain task ${id} has no productionChainId`,
      );
    }
    const processingChains = await this.prisma.processingChain.findMany({
      where: { productionChainId: task.productionChainId },
      select: {
        id: true,
        processingScriptId: true,
        processingScript: {
          select: { defaultVersionId: true },
        },
      },
    });

    type ResolvedNode = {
      nodeKey: number;
      psvId: number;
    };

    const resolved: ResolvedNode[] = [];
    for (const c of processingChains) {
      const psvId = c.processingScript.defaultVersionId;
      if (!psvId) {
        throw new BadRequestException(
          `ProcessingScript ${c.processingScriptId} has no default version`,
        );
      }
      resolved.push({ nodeKey: c.id, psvId });
    }

    if (resolved.length === 0) {
      throw new BadRequestException(
        `ProductionChain ${task.productionChainId} has no processing chains`,
      );
    }

    const edges = await this.prisma.productionChainEdge.findMany({
      where: { productionChainId: task.productionChainId },
      select: { parentChainId: true, childChainId: true, isFanOut: true },
    });
    const childKeys = new Set(edges.map((e) => e.childChainId));

    // Nodes that are the direct child of a FanOut edge.
    // These and all their descendants are NOT created by expand() —
    // they are created later by expandFanOut() when the trigger job completes.
    const fanOutChildKeys = new Set(
      edges.filter((e) => e.isFanOut).map((e) => e.childChainId),
    );

    function isBlocked(nodeKey: number, visited = new Set<number>()): boolean {
      if (fanOutChildKeys.has(nodeKey)) return true;
      if (visited.has(nodeKey)) return false;
      visited.add(nodeKey);
      return edges
        .filter((e) => e.childChainId === nodeKey)
        .some((e) => isBlocked(e.parentChainId, visited));
    }

    // Resolve additional products to stage alongside the main input (e.g. ADF
    // files for DPMC_TST). Each entry is referenced by id; downstream
    // workers look up paths via MediaCatalogEntry.
    const stageProductIds: number[] = [];
    if (task.parameters && typeof task.parameters === 'object') {
      const params = task.parameters as Record<string, unknown>;
      if (Array.isArray(params.stageProducts)) {
        stageProductIds.push(
          ...params.stageProducts.filter(
            (s: unknown): s is number => typeof s === 'number',
          ),
        );
      }
    }
    const stageProductEntries: Array<{ id: number }> = [];
    for (const spId of stageProductIds) {
      const sp = await this.prisma.product.findUnique({
        where: { id: spId },
        select: { id: true },
      });
      if (sp) stageProductEntries.push({ id: sp.id });
    }

    const productionChain = await this.prisma.productionChain.findUnique({
      where: { id: task.productionChainId },
      select: { configuration: true },
    });
    const fanOutPerInput =
      ((productionChain?.configuration ?? {}) as Record<string, unknown>)
        .fanOutPerInput === true;

    const plannedUnsorted = resolved
      .filter((r) => !isBlocked(r.nodeKey))
      .map((r) => ({
        ...r,
        isEntry: !childKeys.has(r.nodeKey),
      }));
    // Batch ids are assigned by the database (auto-increment int) on insert, so
    // a node's parents must be created before it (children wire BatchDatasetIn →
    // parent's datasetOut). The processingChains query has no guaranteed order,
    // so topologically sort planned[] (parents first) over the edge DAG.
    const plannedByKey = new Map(plannedUnsorted.map((p) => [p.nodeKey, p]));
    const planned: typeof plannedUnsorted = [];
    const placed = new Set<number>();
    const visiting = new Set<number>();
    const placeNode = (nodeKey: number): void => {
      if (placed.has(nodeKey) || visiting.has(nodeKey)) return;
      const node = plannedByKey.get(nodeKey);
      if (!node) return; // parent not in planned (blocked / fan-out) — skip
      visiting.add(nodeKey);
      for (const e of edges.filter((e) => e.childChainId === nodeKey)) {
        placeNode(e.parentChainId);
      }
      visiting.delete(nodeKey);
      placed.add(nodeKey);
      planned.push(node);
    };
    for (const p of plannedUnsorted) placeNode(p.nodeKey);
    // Resolve the chain's input products. With fanOutPerInput we run the whole
    // chain once per role=input product (each its own independent datasetOut
    // chain → its own PUBLISH); aux products are shared across instances. The
    // instances share the Task, so the Task only completes once every instance
    // finishes (see recomputeTaskStatus).
    let mainInputs: Array<{ productId: number }> = [];
    let auxInputs: Array<{ productId: number }> = [];
    if (task.inputDatasetId) {
      const dps = await this.prisma.datasetProduct.findMany({
        where: { datasetId: task.inputDatasetId },
        orderBy: { sequence: 'asc' },
        select: { productId: true, role: true },
      });
      mainInputs = dps
        .filter((d) => d.role === 'input')
        .map((d) => ({ productId: d.productId }));
      auxInputs = dps
        .filter((d) => d.role !== 'input')
        .map((d) => ({ productId: d.productId }));
    } else {
      if (task.productId) mainInputs = [{ productId: task.productId }];
      auxInputs = stageProductEntries.map((s) => ({ productId: s.id }));
    }
    const fanOut = fanOutPerInput && mainInputs.length > 1;

    // Legacy single-instance product list (role=input + aux), used when not
    // fanning out and no Task.inputDatasetId is provided.
    const inputProductIds: Array<{ productId: number; role: string }> = [];
    if (task.productId)
      inputProductIds.push({ productId: task.productId, role: 'input' });
    for (const sp of stageProductEntries)
      inputProductIds.push({ productId: sp.id, role: 'aux' });

    await this.prisma.$transaction(
      async (tx) => {
        const defaults = await loadChainParamDefaults(
          tx,
          task.productionChainId!,
        );
        const taskParams = (task.parameters ?? {}) as Record<string, unknown>;

        // Build one full chain instance (all planned nodes + their jobs) whose
        // entry batches consume `instanceInputDatasetId`. Batches are created in
        // topological order so children can wire BatchDatasetIn → the parent's
        // datasetOut. Each instance gets its own executionTag.
        const buildInstance = async (
          instanceInputDatasetId: number | null,
        ): Promise<void> => {
          const instanceTag = randomUUID();
          const batchIdByNodeKey = new Map<number, number>();
          for (const p of planned) {
            const isEntry = !childKeys.has(p.nodeKey);
            const chain = await tx.processingChain.findUnique({
              where: { id: p.nodeKey },
              select: { configuration: true },
            });
            const chainCfg = (chain?.configuration ?? {}) as Record<
              string,
              unknown
            >;
            const parametersIn = mergeParametersIn({
              defaults,
              chainCfg,
              taskParams,
              parentParams: {}, // empty at planning; only fan-out propagates parent parametersOut
            });

            const batch = await tx.batch.create({
              data: {
                projectId: task.projectId,
                taskId: task.id,
                productionChainId: task.productionChainId,
                processingChainId: p.nodeKey,
                executionTag: instanceTag,
                kind: 'Chain' as const,
                priority: task.priority,
                productionMode: task.productionMode,
                priorityClass: task.priorityClass,
                parametersIn: parametersIn as Prisma.InputJsonValue,
              },
              select: { id: true },
            });
            batchIdByNodeKey.set(p.nodeKey, batch.id);

            await tx.dataset.create({
              data: {
                producedByBatchId: batch.id,
                name: `batch:${batch.id}:out`,
              },
            });

            if (isEntry) {
              if (instanceInputDatasetId) {
                await tx.batchDatasetIn.create({
                  data: {
                    batchId: batch.id,
                    datasetId: instanceInputDatasetId,
                    sequence: 0,
                  },
                });
              }
            } else {
              const parentEdges = edges.filter(
                (e) => e.childChainId === p.nodeKey,
              );
              for (let i = 0; i < parentEdges.length; i++) {
                const parentBatchId = batchIdByNodeKey.get(
                  parentEdges[i].parentChainId,
                );
                if (parentBatchId === undefined) continue;
                const parentDataset = await tx.dataset.findUniqueOrThrow({
                  where: { producedByBatchId: parentBatchId },
                  select: { id: true },
                });
                await tx.batchDatasetIn.create({
                  data: {
                    batchId: batch.id,
                    datasetId: parentDataset.id,
                    sequence: i,
                  },
                });
              }
            }
          }

          await tx.job.createMany({
            data: planned.map((p) => ({
              projectId: task.projectId,
              batchId: batchIdByNodeKey.get(p.nodeKey)!,
              processingScriptVersionId: p.psvId,
              executionTag: instanceTag,
              status: p.isEntry ? 'Ready' : 'Waiting',
            })),
          });
        };

        if (fanOut) {
          // One independent chain instance per role=input product.
          for (const mi of mainInputs) {
            const perProducts = [
              { productId: mi.productId, role: 'input' },
              ...auxInputs.map((a) => ({ productId: a.productId, role: 'aux' })),
            ];
            const ds = await tx.dataset.create({
              data: {
                name: `task:${task.id}:input:${mi.productId}`,
                products: {
                  create: perProducts.map((p, i) => ({
                    productId: p.productId,
                    role: p.role,
                    sequence: i,
                  })),
                },
              },
              select: { id: true },
            });
            await buildInstance(ds.id);
          }
        } else {
          // Legacy single instance: reuse Task.inputDatasetId if provided, else
          // build one dataset from task.productId (+ aux).
          let taskInputDatasetId: number | null = task.inputDatasetId ?? null;
          if (!taskInputDatasetId && inputProductIds.length > 0) {
            const created = await tx.dataset.create({
              data: {
                name: `task:${task.id}:input`,
                products: {
                  create: inputProductIds.map((p, i) => ({
                    productId: p.productId,
                    role: p.role,
                    sequence: i,
                  })),
                },
              },
              select: { id: true },
            });
            taskInputDatasetId = created.id;
          }
          await buildInstance(taskInputDatasetId);
        }
      },
      { timeout: 30_000 },
    );

    const reloaded = await this.prisma.task.findFirstOrThrow({
      where: { id, deletedAt: null },
    });
    return taskToDto(reloaded);
  }

  async expandFanOut(_taskId: number, calcBatchId: number): Promise<void> {
    const calcBatch = await this.prisma.batch.findUniqueOrThrow({
      where: { id: calcBatchId },
      select: {
        id: true,
        projectId: true,
        taskId: true,
        executionTag: true,
        priority: true,
        productionMode: true,
        priorityClass: true,
        parametersOut: true,
        processingChainId: true,
        productionChainId: true,
      },
    });

    const parametersOut = calcBatch.parametersOut as Record<
      string,
      unknown
    > | null;
    let blocks = (parametersOut?.blocks ?? []) as Array<
      Record<string, unknown>
    >;

    // If blocks weren't patched into batch.parametersOut by recordOutputs,
    // fall back to reading CALC.json directly from S3. The CALC batch
    // produced exactly one Product whose MediaCatalogEntry path is the S3
    // URL of the calc JSON.
    if (blocks.length === 0) {
      const calcProduct = await this.prisma.product.findFirst({
        where: { parentBatchId: calcBatchId },
        select: {
          mediaCatalogEntries: {
            select: { mediaCatalogEntry: { select: { path: true } } },
            take: 1,
          },
        },
      });
      const calcUrl =
        calcProduct?.mediaCatalogEntries[0]?.mediaCatalogEntry.path;
      if (calcUrl) {
        try {
          // Strip the s3://bucket/ prefix to get the object key.
          const calcKey = calcUrl.replace(/^s3:\/\/[^/]+\//, '');
          const json = (await this.s3.getObjectAsJson(calcKey)) as Record<
            string,
            unknown
          >;
          blocks = (json?.blocks ?? []) as Array<Record<string, unknown>>;
          this.logger.log(
            `expandFanOut: read ${blocks.length} blocks from S3 key ${calcKey}`,
          );
        } catch (err) {
          throw new Error(
            `expandFanOut: batch ${calcBatchId} — failed to read CALC.json from S3 (${(err as Error).message})`,
          );
        }
      }
    }

    if (blocks.length === 0) {
      throw new Error(
        `expandFanOut: batch ${calcBatchId} has empty or missing parametersOut.blocks`,
      );
    }

    const allEdges = await this.prisma.productionChainEdge.findMany({
      where: { productionChainId: calcBatch.productionChainId! },
      select: {
        parentChainId: true,
        childChainId: true,
        dependencyMode: true,
        isFanOut: true,
      },
    });

    const fanOutEdge = allEdges.find(
      (e) => e.parentChainId === calcBatch.processingChainId && e.isFanOut,
    );
    if (!fanOutEdge) {
      throw new Error(
        `expandFanOut: no isFanOut edge from processingChain ${calcBatch.processingChainId}`,
      );
    }
    const tintNodeKey = fanOutEdge.childChainId;

    // Load the TINT node's default script version + chain configuration.
    const tintChain = await this.prisma.processingChain.findUniqueOrThrow({
      where: { id: tintNodeKey },
      select: {
        configuration: true,
        processingScript: { select: { defaultVersionId: true } },
      },
    });
    if (!tintChain.processingScript.defaultVersionId) {
      throw new Error(
        `expandFanOut: TINT processingScript has no defaultVersion`,
      );
    }
    const tintPsvId = tintChain.processingScript.defaultVersionId;
    const tintChainCfg = (tintChain.configuration ?? {}) as Record<
      string,
      unknown
    >;

    // Downstream static edges (everything after TINT, excluding the FanOut edge itself).
    const staticEdges = allEdges.filter((e) => !e.isFanOut);

    // BFS from TINT to find all downstream nodes (COMBINE, PUBLISH, CLEANUP).
    const downstreamMap = new Map<
      number,
      { pChainId: number; incomingEdges: typeof staticEdges }
    >();
    const queue = [tintNodeKey];
    while (queue.length) {
      const key = queue.shift()!;
      for (const e of staticEdges.filter((e) => e.parentChainId === key)) {
        if (!downstreamMap.has(e.childChainId)) {
          downstreamMap.set(e.childChainId, {
            pChainId: e.childChainId,
            incomingEdges: staticEdges.filter(
              (ie) => ie.childChainId === e.childChainId,
            ),
          });
          queue.push(e.childChainId);
        }
      }
    }

    // Load script versions, acronyms, and chain configurations for downstream nodes.
    const downstreamChains = await this.prisma.processingChain.findMany({
      where: { id: { in: [...downstreamMap.keys()] } },
      select: {
        id: true,
        configuration: true,
        processingScript: {
          select: { defaultVersionId: true, acronym: true },
        },
      },
    });
    const psvByChainId = new Map(
      downstreamChains.map((c) => [c.id, c.processingScript.defaultVersionId!]),
    );
    const acronymByChainId = new Map(
      downstreamChains.map((c) => [c.id, c.processingScript.acronym]),
    );
    const chainCfgByChainId = new Map(
      downstreamChains.map((c) => [
        c.id,
        (c.configuration ?? {}) as Record<string, unknown>,
      ]),
    );

    // Grid dimensions embedded in each block for use by COMBINE.
    const gridWidth = (blocks[0]?.gridWidth as number | undefined) ?? 2;
    const gridHeight = (blocks[0]?.gridHeight as number | undefined) ?? 2;

    // Load task parameters (merged into parametersIn for every new batch).
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: calcBatch.taskId },
      select: { parameters: true },
    });
    const taskParams = (task.parameters ?? {}) as Record<string, unknown>;

    const fanOutGroupId = randomUUID();
    const executionTag = calcBatch.executionTag;

    await this.prisma.$transaction(async (tx) => {
      // TINT batches share CALC's upstream datasets (e.g. RESIZE.datasetOut).
      const calcDatasetIns = await tx.batchDatasetIn.findMany({
        where: { batchId: calcBatchId },
        orderBy: { sequence: 'asc' },
        select: { datasetId: true, sequence: true },
      });

      const defaults = await loadChainParamDefaults(
        tx,
        calcBatch.productionChainId!,
      );

      // 1. Create N TINT batches, each with its per-block parametersIn.
      const tintBatchIds: number[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        const tintBatch = await tx.batch.create({
          data: {
            projectId: calcBatch.projectId,
            taskId: calcBatch.taskId,
            productionChainId: calcBatch.productionChainId,
            processingChainId: tintNodeKey,
            fanOutGroupId,
            executionTag,
            kind: 'Chain' as const,
            priority: calcBatch.priority,
            productionMode: calcBatch.productionMode,
            priorityClass: calcBatch.priorityClass,
            parametersIn: mergeParametersIn({
              defaults,
              chainCfg: tintChainCfg,
              taskParams,
              parentParams: block,
            }) as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        const tintBatchId = tintBatch.id;
        tintBatchIds.push(tintBatchId);

        await tx.dataset.create({
          data: {
            producedByBatchId: tintBatchId,
            name: `batch:${tintBatchId}:out`,
          },
        });

        // Child shares CALC's upstream datasets.
        for (const di of calcDatasetIns) {
          await tx.batchDatasetIn.create({
            data: {
              batchId: tintBatchId,
              datasetId: di.datasetId,
              sequence: di.sequence,
            },
          });
        }
      }

      // Create TINT jobs — all Ready (CALC batch is already Completed).
      await tx.job.createMany({
        data: tintBatchIds.map((batchId) => ({
          projectId: calcBatch.projectId,
          batchId,
          processingScriptVersionId: tintPsvId,
          executionTag,
          status: 'Ready' as const,
        })),
      });

      // 2. Create downstream static nodes in topological order.
      //    For each node:
      //      - Fan-in over the sentinel TINT edge → N BatchDatasetIns
      //        (one per TINT.datasetOut, sequence = TINT index)
      //      - Other edges → one BatchDatasetIn pointing at the parent's
      //        datasetOut.
      //      - COMBINE gets gridWidth/gridHeight merged as parentParams.
      // Sentinel marking the fan-out (TINT) parent: its dataset inputs expand
      // to N entries (one per TINT batch) rather than a single parent batch.
      // -1 can never collide with a real auto-increment Batch id (always > 0).
      const FANOUT_SENTINEL = -1;
      const assignedBatchId = new Map<number, number>();
      assignedBatchId.set(tintNodeKey, FANOUT_SENTINEL);

      const remaining = [...downstreamMap.values()];
      let iterations = 0;
      while (remaining.length > 0 && iterations < remaining.length * 2) {
        iterations++;
        const node = remaining.shift()!;
        const allResolved = node.incomingEdges.every((e) =>
          assignedBatchId.has(e.parentChainId),
        );
        if (!allResolved) {
          remaining.push(node);
          continue;
        }

        const nodeAcronym = acronymByChainId.get(node.pChainId) ?? '';
        const nodeChainCfg = chainCfgByChainId.get(node.pChainId) ?? {};

        const parentParams: Record<string, unknown> =
          nodeAcronym === 'COMBINE' ? { gridWidth, gridHeight } : {};

        const createdBatch = await tx.batch.create({
          data: {
            projectId: calcBatch.projectId,
            taskId: calcBatch.taskId,
            productionChainId: calcBatch.productionChainId,
            processingChainId: node.pChainId,
            executionTag,
            kind: 'Chain' as const,
            priority: calcBatch.priority,
            productionMode: calcBatch.productionMode,
            priorityClass: calcBatch.priorityClass,
            parametersIn: mergeParametersIn({
              defaults,
              chainCfg: nodeChainCfg,
              taskParams,
              parentParams,
            }) as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        const batchId = createdBatch.id;

        await tx.dataset.create({
          data: {
            producedByBatchId: batchId,
            name: `batch:${batchId}:out`,
          },
        });

        // Build BatchDatasetIn rows from incoming edges. Sequence numbering
        // is global across all incoming edges; the fan-out edge expands to N
        // entries (one per TINT) which are kept contiguous.
        let seq = 0;
        for (const e of node.incomingEdges) {
          const parentId = assignedBatchId.get(e.parentChainId);
          if (parentId === FANOUT_SENTINEL) {
            for (const tid of tintBatchIds) {
              const tintDataset = await tx.dataset.findUniqueOrThrow({
                where: { producedByBatchId: tid },
                select: { id: true },
              });
              await tx.batchDatasetIn.create({
                data: {
                  batchId,
                  datasetId: tintDataset.id,
                  sequence: seq++,
                },
              });
            }
          } else if (parentId) {
            const parentDataset = await tx.dataset.findUniqueOrThrow({
              where: { producedByBatchId: parentId },
              select: { id: true },
            });
            await tx.batchDatasetIn.create({
              data: { batchId, datasetId: parentDataset.id, sequence: seq++ },
            });
          }
        }

        const psvId = psvByChainId.get(node.pChainId);
        if (psvId) {
          await tx.job.create({
            data: {
              projectId: calcBatch.projectId,
              batchId,
              processingScriptVersionId: psvId,
              executionTag,
              status: 'Waiting' as const,
            },
          });
        }
        assignedBatchId.set(node.pChainId, batchId);
      }
    });
  }

  async executionTree(id: number, projectId: number): Promise<ExecutionTree> {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId, deletedAt: null },
      include: {
        productionChain: { select: { id: true, name: true } },
        batches: {
          include: {
            jobs: { select: { id: true, status: true, hostId: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    const dto = taskToDto(task);
    return {
      task: dto,
      productionChain: {
        id: task.productionChain?.id ?? null,
        name: task.productionChain?.name ?? null,
        version: null,
      },
      batches: task.batches.map((b) => ({
        id: b.id,
        status: b.status,
        jobs: b.jobs.map((j) => ({
          id: j.id,
          status: j.status,
          hostId: j.hostId,
        })),
      })),
    };
  }

  async listBatches(id: number, projectId: number) {
    await this.getById(id, projectId); // throws 404 if missing
    const batches = await this.prisma.batch.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        jobs: {
          select: {
            hostId: true,
            host: { select: { hostname: true } },
            processingScriptVersion: {
              select: {
                processingScript: {
                  select: { acronym: true, name: true },
                },
              },
            },
          },
        },
      },
    });
    return batches.map(({ jobs, ...batch }) => {
      const seen = new Set<string>();
      const scripts: Array<{ acronym: string; name: string }> = [];
      const seenHosts = new Set<number>();
      const hosts: Array<{ id: number; hostname: string }> = [];
      for (const j of jobs) {
        const s = j.processingScriptVersion.processingScript;
        if (!seen.has(s.acronym)) {
          seen.add(s.acronym);
          scripts.push(s);
        }
        if (j.hostId && !seenHosts.has(j.hostId)) {
          seenHosts.add(j.hostId);
          hosts.push({
            id: j.hostId,
            hostname: j.host?.hostname ?? String(j.hostId),
          });
        }
      }
      return { ...batch, scripts, hosts };
    });
  }

  async listHistory(
    id: number,
    projectId: number,
  ): Promise<TaskHistoryEntry[]> {
    await this.getById(id, projectId);
    const jobs = await this.prisma.job.findMany({
      where: { batch: { taskId: id } },
      select: {
        id: true,
        batchId: true,
        status: true,
        hostId: true,
        startedAt: true,
        endedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return jobs.map((j) => ({
      jobId: j.id,
      batchId: j.batchId,
      status: j.status,
      hostId: j.hostId,
      startedAt: j.startedAt,
      endedAt: j.endedAt,
    }));
  }

  async statusSummary(projectId: number): Promise<TaskStatusSummary> {
    const rows = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId, deletedAt: null },
      _count: { _all: true },
    });
    const out: TaskStatusSummary = {
      Edited: 0,
      Queued: 0,
      Running: 0,
      Done: 0,
      Error: 0,
      Suspended: 0,
    };
    for (const r of rows) {
      out[r.status] = r._count._all;
    }
    return out;
  }

  private async assertProcessorVersionExists(id: number): Promise<void> {
    const exists = await this.prisma.processorVersion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`ProcessorVersion ${id} not found`);
    }
  }
}
