import { ConfigService } from '@/core/config';
import { PrismaService } from '@/core/prisma';
import {
  EVENTS,
  type BatchStatusChangedPayload,
  type JobStatusChangedPayload,
  type TaskStatusChangedPayload,
} from '@/core/monitoring/monitoring.events';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  ScriptType,
  type BatchStatus,
  type ContainerRuntime,
  type TaskStatus,
} from '@dpmc/prisma';
import { posix as path } from 'path';
import { TaskService } from '@/modules/task/task.service';

import type { JobResultBody } from './worker.dto';

const TERMINAL_JOB_STATUSES = new Set([
  'Success',
  'Failed',
  'Skipped',
  'Cancelled',
]);

const TERMINAL_BATCH_STATUSES = new Set(['Success', 'Failed', 'Cancelled']);

interface DispatchMount {
  source: string;
  target: string;
  readOnly?: boolean;
}

interface StageInEntry {
  url?: string;
  content?: string;
  localName: string;
  role?: string | null;
}

interface StageOutEntry {
  key: string;
  localName: string;
  role?: string | null;
  contentType?: string | null;
}

interface DispatchPayload {
  jobId: number;
  image: string | null;
  runtime: ContainerRuntime;
  command: string[];
  env: Record<string, string>;
  mounts: DispatchMount[];
  resources: { cpus: number; memoryBytes: string; gpus: number[] };
  stageIn?: StageInEntry[];
  stageOut?: StageOutEntry[];
}

const INTERPRETERS: Partial<Record<ScriptType, string>> = {
  [ScriptType.Python]: 'python',
  [ScriptType.Bash]: 'bash',
};

const SCRIPT_TARGET_DIR = '/app';
const WORKDIR_TARGET = '/work';

@Injectable()
export class WorkerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
    private readonly taskService: TaskService,
  ) {}

  /**
   * Return the resolved input contract for a batch — used by script containers
   * to fetch their own input Products directly (no worker-side staging).
   * Worker-token authenticated, not project-scoped.
   */
  async getBatchInputs(batchId: number) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, parametersIn: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    const ins = await this.prisma.batchDatasetIn.findMany({
      where: { batchId },
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
                    mediaCatalogEntries: {
                      select: {
                        mediaCatalogEntry: {
                          select: {
                            path: true,
                            size: true,
                            mediaCatalog: {
                              select: {
                                name: true,
                                media: { select: { type: true, name: true } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      batchId: batch.id,
      parametersIn:
        (batch.parametersIn as Record<string, unknown> | null) ?? null,
      // Hand the script the full Product → MediaCatalogEntry → MediaCatalog →
      // Media graph and let it decide how to retrieve each entry from its
      // storage backend. No flattening, no worker-side staging.
      inputs: ins.flatMap(({ dataset }) =>
        dataset.products.map(({ role, product }) => ({
          role,
          product: {
            id: product.id,
            name: product.name,
            productType: product.productType,
            mediaCatalogEntries: product.mediaCatalogEntries.map(
              ({ mediaCatalogEntry: e }) => ({
                mediaCatalogEntry: {
                  path: e.path,
                  // BigInt isn't JSON-serializable — emit a decimal string.
                  size: e.size?.toString() ?? null,
                  mediaCatalog: e.mediaCatalog,
                },
              }),
            ),
          },
        })),
      ),
    };
  }

  /**
   * Atomically pick the next Ready job whose JobAllocation points to this host
   * and is not yet released. Flip Job.status to 'Running' and return the
   * dispatch payload. Returns null when nothing is pending.
   *
   * Uses SELECT … FOR UPDATE SKIP LOCKED inside a transaction so concurrent
   * workers cannot pick the same job.
   */
  async nextJob(hostId: number): Promise<DispatchPayload | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: number;
          batchId: number;
          taskId: number;
          processingScriptVersionId: number;
          jobProcessorVersionId: number | null;
          batchProcessorVersionId: number | null;
          batchExecutionTag: string;
          allocCpu: number;
          allocRam: bigint;
          allocDisk: bigint;
          gpuIndices: number[];
        }>
      >`
        SELECT j.id,
               j."batchId",
               b."taskId",
               j."processingScriptVersionId",
               j."processorVersionId"  AS "jobProcessorVersionId",
               b."processorVersionId"  AS "batchProcessorVersionId",
               b."executionTag"        AS "batchExecutionTag",
               a."reservedCpu"         AS "allocCpu",
               a."reservedRam"         AS "allocRam",
               a."reservedDisk"        AS "allocDisk",
               a."gpuIndices"
        FROM "job" j
        JOIN "batch" b           ON b.id = j."batchId"
        JOIN "job_x_allocation" a   ON a."jobId" = j.id
        WHERE j.status = 'ready'::job_status
          AND a."hostId" = ${hostId}
          AND a."releasedAt" IS NULL
        ORDER BY j."createdAt" ASC
        LIMIT 1
        FOR UPDATE OF j SKIP LOCKED
      `;
      if (rows.length === 0) return null;
      const row = rows[0];

      // Resolve effective processorVersionId: job-level wins, then batch-level.
      const effectivePvId =
        row.jobProcessorVersionId ?? row.batchProcessorVersionId ?? null;

      const now = new Date();
      await tx.job.update({
        where: { id: row.id },
        data: {
          status: 'Running',
          startedAt: now,
          hostId,
          ...(effectivePvId !== null && row.jobProcessorVersionId === null
            ? { processorVersionId: effectivePvId }
            : {}),
        },
      });

      // Promote the parent batch on first job start.
      await this.maybeStartBatch(tx, row.batchId, now);

      const psv = await tx.processingScriptVersion.findUnique({
        where: { id: row.processingScriptVersionId },
        select: {
          version: true,
          imageUrl: true,
          imageTag: true,
          imageChecksum: true,
          runtime: true,
          processingScript: { select: { acronym: true } },
          executables: {
            orderBy: [{ stage: 'asc' }, { sequence: 'asc' }],
            select: { scriptType: true, path: true, name: true, args: true },
          },
        },
      });
      if (!psv)
        throw new NotFoundException(
          `ProcessingScriptVersion ${row.processingScriptVersionId} missing`,
        );

      const resolvedImage = psv.imageChecksum
        ? `${psv.imageUrl}@${psv.imageChecksum}`
        : psv.imageUrl
          ? `${psv.imageUrl}:${psv.imageTag ?? 'latest'}`
          : null;

      await tx.job.update({
        where: { id: row.id },
        data: { resolvedImage },
      });

      let auxName = '';
      let baseline = '';
      if (effectivePvId) {
        const pv = await tx.processorVersion.findUnique({
          where: { id: effectivePvId },
          select: {
            baseline: true,
            auxiliaryConfiguration: { select: { name: true } },
          },
        });
        if (pv) {
          auxName = pv.auxiliaryConfiguration?.name ?? '';
          baseline = pv.baseline ?? '';
        }
      }

      const batch = await tx.batch.findUnique({
        where: { id: row.batchId },
        select: {
          parametersIn: true,
          processingChainId: true,
          configuration: true,
        },
      });

      const stageOut = await this.extractStageOut(
        tx,
        row.batchId,
        batch?.processingChainId ?? null,
      );

      // In-image scripts (DPMC_TST) keep the legacy stage-in flow: the worker
      // downloads each DatasetIn Product into `/work/input/<name>` before the
      // container starts. Mounted scripts (Warhol) fetch their own inputs
      // from the API at runtime — no worker-side staging.
      const exe = psv.executables[0];
      const isInImage = exe ? !exe.path.startsWith('/app/') : false;
      const stageIn = isInImage
        ? await this.resolveStageInDir(tx, row.batchId)
        : [];

      const { command, mounts } = this.buildExecution({
        batchId: row.batchId,
        scriptAcronym: psv.processingScript.acronym,
        scriptVersion: psv.version,
        executables: psv.executables,
        stageOut,
      });

      return {
        jobId: row.id,
        image: resolvedImage,
        runtime: psv.runtime,
        command,
        env: {
          // Mounted (Warhol) scripts import the shared `dpmc_io` lib bind-mounted
          // at /dpmc_lib by buildExecution(). Guarantee it's on the import path
          // here so scripts work on any base image, not only data/warhol/Dockerfile.
          // In-image scripts don't mount /dpmc_lib — leave their PYTHONPATH alone.
          ...(isInImage ? {} : { PYTHONPATH: '/dpmc_lib' }),
          DPMC_JOB_ID: String(row.id),
          DPMC_BATCH_ID: String(row.batchId),
          DPMC_TASK_ID: String(row.taskId),
          DPMC_TASK_TAG: row.batchExecutionTag,
          DPMC_PROCESSOR_VERSION_ID:
            effectivePvId !== null ? String(effectivePvId) : '',
          DPMC_AUX_CONFIG_NAME: auxName,
          DPMC_BASELINE: baseline,
          DPMC_API_URL: this.config.get('SCRIPT_API_URL'),
          DPMC_API_TOKEN: this.config.get('WORKER_REGISTRATION_TOKEN'),
          S3_ENDPOINT: this.config.get('SCRIPT_S3_ENDPOINT'),
          S3_REGION: this.config.get('S3_REGION'),
          S3_ACCESS_KEY: this.config.get('S3_ACCESS_KEY'),
          S3_SECRET_KEY: this.config.get('S3_SECRET_KEY'),
          S3_BUCKET: this.config.get('S3_BUCKET'),
        },
        mounts,
        resources: {
          cpus: row.allocCpu,
          memoryBytes: row.allocRam.toString(),
          gpus: row.gpuIndices ?? [],
        },
        ...(stageIn.length > 0 ? { stageIn } : {}),
        ...(stageOut.length > 0 ? { stageOut } : {}),
      };
    });
  }

  /**
   * Resolve every Product reachable from this Batch's BatchDatasetIn into a
   * stage-in entry placed under `/work/input/<productName>`. Used by in-image
   * scripts (DPMC_TST) that expect a directory of inputs.
   */
  private async resolveStageInDir(
    tx: Prisma.TransactionClient,
    batchId: number,
  ): Promise<StageInEntry[]> {
    const ins = await tx.batchDatasetIn.findMany({
      where: { batchId },
      orderBy: { sequence: 'asc' },
      include: {
        dataset: {
          include: {
            products: {
              orderBy: { sequence: 'asc' },
              include: {
                product: {
                  include: {
                    mediaCatalogEntries: {
                      select: {
                        mediaCatalogEntry: { select: { path: true } },
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const out: StageInEntry[] = [];
    for (const { dataset } of ins) {
      for (const { role, product } of dataset.products) {
        const url = product.mediaCatalogEntries[0]?.mediaCatalogEntry.path;
        if (!url) continue;
        out.push({ url, localName: `input/${product.name}`, role });
      }
    }
    return out;
  }

  /**
   * Build the dispatch's stageOut array from ProcessingChain.outputs. Each
   * entry is keyed under `products/<batchId>/<basename>` so concurrent batches
   * cannot collide on a shared S3 prefix.
   */
  private async extractStageOut(
    tx: Prisma.TransactionClient,
    batchId: number,
    processingChainId: number | null,
  ): Promise<StageOutEntry[]> {
    if (!processingChainId) return [];
    const chain = await tx.processingChain.findUnique({
      where: { id: processingChainId },
      select: { outputs: true },
    });
    const outputs = (chain?.outputs ?? []) as Array<{
      role?: string;
      localName: string;
      contentType?: string;
      productTypeAcronym?: string;
    }>;
    return outputs.map((o) => ({
      key: `products/${batchId}/${o.localName.split('/').pop() ?? o.localName}`,
      localName: o.localName,
      role: o.role ?? null,
      contentType: o.contentType,
    }));
  }

  /**
   * Build the container command and bind mounts for a Warhol-style job.
   *
   * Convention: scripts mounted from `data/warhol/<exe.name>/<psv.version>/`
   * into `/app`, the task's run directory mounted at `/work`. The API
   * auto-appends `--output` from `ProcessingChain.outputs`; scripts fetch
   * their own inputs from the API (DPMC_BATCH_ID + DPMC_API_URL env) and
   * download Products directly from S3.
   */
  private buildExecution(args: {
    batchId: number;
    scriptAcronym: string;
    scriptVersion: string;
    executables: Array<{
      scriptType: ScriptType;
      path: string;
      name: string;
      args: string | null;
    }>;
    stageOut: StageOutEntry[];
  }): {
    command: string[];
    mounts: DispatchMount[];
  } {
    const warholRoot =
      this.config.get('WARHOL_DATA_ROOT') ||
      path.join(process.cwd(), 'data/warhol');

    const exe = args.executables[0];
    if (!exe) return { command: [], mounts: [] };

    const interpreter = INTERPRETERS[exe.scriptType];
    const scriptFlags = exe.args ? exe.args.split(/\s+/).filter(Boolean) : [];
    const command = [
      ...(interpreter ? [interpreter] : []),
      exe.path,
      ...scriptFlags,
    ];

    const workdirSource = path.join(warholRoot, 'runs', String(args.batchId));
    const scriptSource = path.join(warholRoot, exe.name, args.scriptVersion);
    const libSource = path.join(warholRoot, '_lib');
    const isInImage = !exe.path.startsWith(SCRIPT_TARGET_DIR + '/');

    if (isInImage) {
      // In-image scripts use positional args: <input_dir> <output_dir>.
      command.push(
        path.join(WORKDIR_TARGET, 'input'),
        path.join(WORKDIR_TARGET, 'out'),
      );
      return {
        command,
        mounts: [{ source: workdirSource, target: WORKDIR_TARGET }],
      };
    }

    const out = args.stageOut[0];
    if (out) {
      command.push('--output', path.join(WORKDIR_TARGET, out.localName));
    }

    return {
      command,
      mounts: [
        { source: scriptSource, target: SCRIPT_TARGET_DIR, readOnly: true },
        { source: libSource, target: '/dpmc_lib', readOnly: true },
        { source: workdirSource, target: WORKDIR_TARGET },
      ],
    };
  }

  async reportResult(
    hostId: number,
    jobId: number,
    body: JobResultBody,
  ): Promise<{ jobId: number; status: string }> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        allocation: true,
        batch: {
          select: {
            id: true,
            taskId: true,
            projectId: true,
            processingChainId: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    if (!job.allocation || job.allocation.hostId !== hostId) {
      throw new NotFoundException(
        `Job ${jobId} is not allocated to host ${hostId}`,
      );
    }

    const m = body.metrics ?? {};
    const now = new Date();
    let batchTransition: {
      status: BatchStatus;
      startedAt: Date | null;
      endedAt: Date | null;
    } | null = null;
    let taskTransition: {
      taskId: number;
      projectId: number;
      status: TaskStatus;
      completedAt: Date;
    } | null = null;
    let needsFanOut = false;

    await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: body.status,
          endedAt: now,
          lastError: body.errorMessage ?? null,
          avgPower: m.avgPower ?? null,
          dataVolume: m.dataVolume == null ? null : BigInt(m.dataVolume),
          metrics:
            body.metrics === undefined
              ? Prisma.JsonNull
              : (body.metrics as Prisma.InputJsonValue),
        },
      });
      await tx.jobAllocation.update({
        where: { id: job.allocation!.id },
        data: { releasedAt: now },
      });
      batchTransition = await this.recomputeBatchStatus(tx, job.batchId, now);

      if (
        batchTransition &&
        (batchTransition as { status: BatchStatus }).status === 'Success' &&
        job.batch.processingChainId
      ) {
        const fanOutEdge = await tx.productionChainEdge.findFirst({
          where: { parentChainId: job.batch.processingChainId, isFanOut: true },
          select: { id: true },
        });
        needsFanOut = fanOutEdge !== null;
      }

      // Roll up to the Task only if the Batch just reached a terminal state
      // AND there is no pending fanout expansion. If fanout is needed we must
      // first create the new batches so recomputeTaskStatus sees non-terminal
      // Pending/Waiting batches and correctly leaves the task Running.
      if (
        !needsFanOut &&
        batchTransition &&
        TERMINAL_BATCH_STATUSES.has(
          (batchTransition as { status: BatchStatus }).status,
        )
      ) {
        taskTransition = await this.recomputeTaskStatus(
          tx,
          job.batch.taskId,
          now,
        );
      }
    });

    // After the transaction: trigger fanout expansion if needed.
    let fanOutError: Error | null = null;
    if (needsFanOut) {
      try {
        await this.taskService.expandFanOut(job.batch.taskId, job.batchId);
      } catch (err) {
        // expandFanOut failed: mark the triggering batch as Failed so the task
        // rolls up to Error instead of staying Running forever.
        fanOutError = err as Error;
        const failedAt = new Date();
        await this.prisma.$transaction(async (tx) => {
          await tx.batch.update({
            where: { id: job.batchId },
            data: { status: 'Failed', endedAt: failedAt },
          });
          taskTransition = await this.recomputeTaskStatus(
            tx,
            job.batch.taskId,
            failedAt,
          );
        });
        // Override batchTransition so the Failed status gets emitted below.
        batchTransition = {
          status: 'Failed',
          startedAt: now,
          endedAt: failedAt,
        };
      }
    }

    const jobPayload: JobStatusChangedPayload = {
      jobId,
      batchId: job.batchId,
      productionChainId: null,
      status: body.status,
      hostId,
      startedAt: job.startedAt?.toISOString() ?? null,
      endedAt: now.toISOString(),
    };
    this.events.emit(EVENTS.JOB_STATUS_CHANGED, jobPayload);

    if (batchTransition) {
      const transition = batchTransition;
      const batchPayload: BatchStatusChangedPayload = {
        batchId: job.batchId,
        productionChainId: null,
        status: transition.status,
        startedAt: transition.startedAt?.toISOString() ?? null,
        endedAt: transition.endedAt?.toISOString() ?? null,
      };
      this.events.emit(EVENTS.BATCH_STATUS_CHANGED, batchPayload);
    }

    if (taskTransition) {
      const tt = taskTransition as {
        taskId: number;
        projectId: number;
        status: TaskStatus;
        completedAt: Date;
      };
      const taskPayload: TaskStatusChangedPayload = {
        taskId: tt.taskId,
        projectId: tt.projectId,
        status: tt.status,
        completedAt: tt.completedAt.toISOString(),
      };
      this.events.emit(EVENTS.TASK_STATUS_CHANGED, taskPayload);
    }

    // Re-throw fanout error after events so worker sees 500 and logs the failure.
    if (fanOutError) throw fanOutError;

    return { jobId, status: body.status };
  }

  /**
   * Aggregate the Task's batches and, if they all reached a terminal state,
   * transition the Task to Done / Error. Returns the new state when the
   * Task moved, null otherwise. Uses an updateMany guarded on Running so
   * concurrent job completions never race the lifecycle.
   *
   * Mapping:
   *   - any Failed or Cancelled batch  → Task.Error
   *   - otherwise all Success           → Task.Done
   */
  private async recomputeTaskStatus(
    tx: Prisma.TransactionClient,
    taskId: number,
    at: Date,
  ): Promise<{
    taskId: number;
    projectId: number;
    status: TaskStatus;
    completedAt: Date;
  } | null> {
    const batches = await tx.batch.findMany({
      where: { taskId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (batches.length === 0) return null;

    const anyFailed = batches.some((b) => b.status === 'Failed');
    const allTerminal = batches.every((b) =>
      TERMINAL_BATCH_STATUSES.has(b.status),
    );

    // When a batch fails, cascade-cancel any batches that are still pending
    // (they'll never be able to run since their upstream dependency failed).
    if (!allTerminal && anyFailed) {
      const nonTerminalIds = batches
        .filter((b) => !TERMINAL_BATCH_STATUSES.has(b.status))
        .map((b) => b.id);
      await tx.job.updateMany({
        where: {
          batchId: { in: nonTerminalIds },
          status: { notIn: ['Success', 'Failed', 'Skipped', 'Cancelled'] },
        },
        data: { status: 'Cancelled', endedAt: at },
      });
      await tx.batch.updateMany({
        where: { id: { in: nonTerminalIds } },
        data: { status: 'Cancelled', endedAt: at },
      });
    } else if (!allTerminal) {
      return null;
    }

    // Only `Failed` flips the task to Error. A `Cancelled` batch means
    // we walked an OnFailure / unused DAG branch (its job got Skipped by
    // the dispatcher and the finalizer sealed the batch as Cancelled) —
    // that's a normal control-flow outcome, not a task error. Keep this
    // aligned with `dispatcher/services/finalizer.py`.
    const next: TaskStatus = anyFailed ? 'Error' : 'Done';

    const result = await tx.task.updateMany({
      where: { id: taskId, status: 'Running' },
      data: { status: next, completedAt: at },
    });
    if (result.count === 0) return null;

    const task = await tx.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { projectId: true },
    });
    return { taskId, projectId: task.projectId, status: next, completedAt: at };
  }

  /**
   * Persist stage-out results published by the worker after a successful
   * job execution. Each output becomes a Product row whose `parentBatchId`
   * is the job's batch. The Product's `productTypeId` is derived from the
   * `productTypeAcronym` declared alongside the matching entry in
   * `ProcessingChain.outputs`. Successfully persisted products are also
   * attached to the Batch's output Dataset so downstream batches can pick
   * them up via BatchDatasetIn. Idempotent on (parentBatchId, name).
   */
  /** UTC `YYYYMMDDTHHMMSSmmm` — compact, sortable timestamp for product names. */
  private compactTimestamp(d: Date): string {
    return d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.(\d{3})Z$/, '$1');
  }

  /**
   * For the processing-level scheme: resolve the target output product type
   * (one level above the chain's input). All batches of a chain instance share
   * an executionTag; the entry batch's DatasetIn references a non-batch-produced
   * dataset (the task/instance input), whose role='input' product carries the
   * source level. Returns `<base>_L<n+1>` + its level string, or null.
   */
  private async resolveOutputLevel(
    taskId: number,
    executionTag: string,
  ): Promise<{ acronym: string; level: string } | null> {
    const link = await this.prisma.batchDatasetIn.findFirst({
      where: {
        batch: { taskId, executionTag },
        dataset: { producedByBatchId: null },
      },
      select: {
        dataset: {
          select: {
            products: {
              where: { role: 'input' },
              take: 1,
              select: {
                product: {
                  select: {
                    productType: {
                      select: { acronym: true, processingLevel: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const pt = link?.dataset.products[0]?.product.productType;
    if (!pt) return null;
    const m = pt.acronym.match(/^(.*)_L(\d+)$/);
    const base = m ? m[1] : pt.acronym;
    const n = m
      ? parseInt(m[2], 10)
      : parseInt(pt.processingLevel || '0', 10) || 0;
    return { acronym: `${base}_L${n + 1}`, level: String(n + 1) };
  }

  async recordOutputs(
    hostId: number,
    jobId: number,
    body: {
      outputs: Array<{
        role?: string | null;
        localName: string;
        key: string;
        size: number;
        content?: unknown;
      }>;
    },
  ): Promise<{
    products: Array<{
      id: number;
      role: string | null;
      name: string;
      url: string;
    }>;
  }> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        allocation: true,
        batch: {
          select: {
            id: true,
            projectId: true,
            taskId: true,
            executionTag: true,
            processingChainId: true,
            createdAt: true,
            datasetOut: { select: { id: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    if (!job.allocation || job.allocation.hostId !== hostId) {
      throw new NotFoundException(
        `Job ${jobId} is not allocated to host ${hostId}`,
      );
    }

    const bucket = this.config.get('S3_BUCKET');
    const chain = await this.prisma.processingChain.findUnique({
      where: { id: job.batch.processingChainId ?? -1 },
      select: {
        outputs: true,
        productionChain: { select: { configuration: true } },
      },
    });
    const expected = this.expectedOutputIndex(chain?.outputs ?? null);

    // Processing-level scheme: when the production chain opts in, every product
    // this run emits is typed one level above the chain's *input* product
    // (e.g. WARHOL_SAT_L0 input → WARHOL_SAT_L1 outputs), regardless of the
    // node's static output type. All batches of a chain instance share an
    // executionTag, so we resolve the input product from whichever entry batch
    // (its DatasetIn references a non-batch-produced dataset) carries it.
    const chainCfg = (chain?.productionChain?.configuration ?? {}) as Record<
      string,
      unknown
    >;
    const levelOverride =
      chainCfg.incrementProcessingLevel === true
        ? await this.resolveOutputLevel(
            job.batch.taskId,
            job.batch.executionTag,
          )
        : null;

    // Lazy-init the runtime outputs catalog once per call.
    let runtimeCatalogId: number | null = null;
    const getRuntimeCatalog = async (): Promise<number> => {
      if (runtimeCatalogId) return runtimeCatalogId;
      const media = await this.prisma.media.findFirst({
        where: { name: bucket },
        select: { id: true },
      });
      if (!media)
        throw new Error(`Media record for bucket '${bucket}' not found`);
      const catalog = await this.prisma.mediaCatalog.upsert({
        where: { mediaId_name: { mediaId: media.id, name: 'RUNTIME_OUTPUTS' } },
        update: {},
        create: { mediaId: media.id, name: 'RUNTIME_OUTPUTS' },
        select: { id: true },
      });
      runtimeCatalogId = catalog.id;
      return runtimeCatalogId;
    };

    const results: Array<{
      id: number;
      role: string | null;
      name: string;
      url: string;
    }> = [];

    let outIdx = -1;
    for (const o of body.outputs) {
      outIdx += 1;
      const decl = this.matchExpectedOutput(o.localName, expected);
      // Level scheme overrides the node's static output type with the
      // input-level+1 type; otherwise keep the declared productTypeAcronym.
      const acronym = levelOverride?.acronym ?? decl?.productTypeAcronym;

      if (decl && acronym) {
        // Upsert the product type so runtime types (e.g. 'PROCESSED') are
        // created on demand without requiring a seeder re-run. Under the level
        // scheme, stamp its processingLevel too.
        const productType = await this.prisma.productType.upsert({
          where: { acronym },
          update: levelOverride ? { processingLevel: levelOverride.level } : {},
          create: {
            acronym,
            name: acronym,
            ...(levelOverride
              ? { processingLevel: levelOverride.level }
              : {}),
          },
          select: { id: true },
        });

        // Level-scheme products are named <acronym>_<timestamp>; the batch id
        // (+ output index for multi-output batches) keeps the name unique
        // without dropping the timestamp.
        const name = levelOverride
          ? `${acronym}_${this.compactTimestamp(job.batch.createdAt)}_${job.batch.id}${
              body.outputs.length > 1 ? `_${outIdx}` : ''
            }`
          : `${job.batch.id}-${o.localName.replace(/[/]/g, '-')}`;
        const url = `s3://${bucket}/${o.key}`;

        const existing = await this.prisma.product.findFirst({
          where: { name, version: null },
          select: { id: true },
        });
        const product = existing
          ? await this.prisma.product.update({
              where: { id: existing.id },
              data: { parentBatchId: job.batch.id },
            })
          : await this.prisma.product.create({
              data: {
                name,
                productTypeId: productType.id,
                parentBatchId: job.batch.id,
                generatedAt: new Date(),
              },
            });

        // Persist the S3 URL so downstream resolveStageIn can find it via
        // Product → ProductMediaCatalogEntry → MediaCatalogEntry.path.
        const catalogId = await getRuntimeCatalog();
        const mce = await this.prisma.mediaCatalogEntry.upsert({
          where: {
            mediaCatalogId_path: { mediaCatalogId: catalogId, path: url },
          },
          update: { size: BigInt(o.size) },
          create: {
            mediaCatalogId: catalogId,
            path: url,
            size: BigInt(o.size),
          },
          select: { id: true },
        });
        await this.prisma.productMediaCatalogEntry.upsert({
          where: {
            productId_mediaCatalogEntryId: {
              productId: product.id,
              mediaCatalogEntryId: mce.id,
            },
          },
          update: {},
          create: { productId: product.id, mediaCatalogEntryId: mce.id },
        });

        // Attach the produced Product to the Batch's output Dataset so
        // downstream batches can discover it via BatchDatasetIn.
        const datasetOutId = job.batch.datasetOut?.id;
        if (datasetOutId) {
          const seq = await this.prisma.datasetProduct.count({
            where: { datasetId: datasetOutId },
          });
          await this.prisma.datasetProduct.upsert({
            where: {
              datasetId_productId: {
                datasetId: datasetOutId,
                productId: product.id,
              },
            },
            update: {},
            create: {
              datasetId: datasetOutId,
              productId: product.id,
              role: decl?.role ?? 'output',
              sequence: seq,
            },
          });
        }

        results.push({
          id: product.id,
          role: o.role ?? null,
          name: product.name,
          url,
        });
      }

      // For JSON outputs that carry inline content (e.g. CALC blocks), patch
      // the batch parametersOut so expandFanOut can read it without an S3 fetch.
      if (
        o.content &&
        typeof o.content === 'object' &&
        !Array.isArray(o.content)
      ) {
        const current = await this.prisma.batch.findUnique({
          where: { id: job.batch.id },
          select: { parametersOut: true },
        });
        const existing = (current?.parametersOut ?? {}) as Record<
          string,
          unknown
        >;
        await this.prisma.batch.update({
          where: { id: job.batch.id },
          data: {
            parametersOut: {
              ...existing,
              ...(o.content as Record<string, unknown>),
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    return { products: results };
  }

  /**
   * Match a reported localName against the declared expected output index.
   * First tries an exact key lookup; falls back to glob pattern matching
   * (supporting ``*`` wildcards within a path segment) for entries like
   * ``out/*.txt``.
   */
  private matchExpectedOutput(
    localName: string,
    idx: Map<
      string,
      { role: string | null; productTypeAcronym: string | null }
    >,
  ): { role: string | null; productTypeAcronym: string | null } | undefined {
    const exact = idx.get(localName);
    if (exact) return exact;
    for (const [pattern, decl] of idx) {
      if (!pattern.includes('*')) continue;
      const re = new RegExp(
        '^' +
          pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') +
          '$',
      );
      if (re.test(localName)) return decl;
    }
    return undefined;
  }

  /**
   * Index ProcessingChain.outputs[] by localName → { role, productTypeAcronym }.
   * Returns an empty Map for malformed/missing output declarations.
   */
  private expectedOutputIndex(
    outputs: Prisma.JsonValue | null | undefined,
  ): Map<string, { role: string | null; productTypeAcronym: string | null }> {
    const idx = new Map<
      string,
      { role: string | null; productTypeAcronym: string | null }
    >();
    if (!Array.isArray(outputs)) return idx;
    for (const e of outputs) {
      if (!e || typeof e !== 'object') continue;
      const rec = e as Record<string, unknown>;
      const localName =
        typeof rec.localName === 'string' ? rec.localName : null;
      if (!localName) continue;
      idx.set(localName, {
        role: typeof rec.role === 'string' ? rec.role : null,
        productTypeAcronym:
          typeof rec.productTypeAcronym === 'string'
            ? rec.productTypeAcronym
            : null,
      });
    }
    return idx;
  }

  /**
   * Promote a Pending batch to Running on its first started job.
   * No-op if the batch is already past Pending.
   */
  private async maybeStartBatch(
    tx: Prisma.TransactionClient,
    batchId: number,
    at: Date,
  ): Promise<void> {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      select: { status: true },
    });
    if (!batch || batch.status !== 'Pending') return;
    await tx.batch.update({
      where: { id: batchId },
      data: { status: 'Running', startedAt: at },
    });
    this.events.emit(EVENTS.BATCH_STATUS_CHANGED, {
      batchId,
      productionChainId: null,
      status: 'Running',
      startedAt: at.toISOString(),
      endedAt: null,
    } satisfies BatchStatusChangedPayload);
  }

  /**
   * Derive the batch status from its jobs.
   *
   * Pending     → first job started  → Running
   * Running     → all jobs terminal  → Success / Failed / Cancelled
   *
   * Returns the new transition for callers that want to emit an event;
   * null when the batch status didn't change.
   */
  private async recomputeBatchStatus(
    tx: Prisma.TransactionClient,
    batchId: number,
    at: Date,
  ): Promise<{
    status: BatchStatus;
    startedAt: Date | null;
    endedAt: Date | null;
  } | null> {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      select: { status: true, startedAt: true },
    });
    if (!batch) return null;

    const jobs = await tx.job.findMany({
      where: { batchId },
      select: { status: true },
    });
    if (jobs.length === 0) return null;

    const allTerminal = jobs.every((j) => TERMINAL_JOB_STATUSES.has(j.status));
    let next: BatchStatus | null = null;
    if (allTerminal) {
      const hasFailed = jobs.some((j) => j.status === 'Failed');
      const hasCancelled = jobs.some((j) => j.status === 'Cancelled');
      next = hasFailed ? 'Failed' : hasCancelled ? 'Cancelled' : 'Success';
    } else if (jobs.some((j) => j.status === 'Running')) {
      next = 'Running';
    }
    if (!next || next === batch.status) return null;

    const updated = await tx.batch.update({
      where: { id: batchId },
      data: {
        status: next,
        startedAt:
          batch.startedAt ?? (next === 'Running' ? at : batch.startedAt),
        endedAt: allTerminal ? at : null,
      },
      select: { status: true, startedAt: true, endedAt: true },
    });
    return updated;
  }
}
