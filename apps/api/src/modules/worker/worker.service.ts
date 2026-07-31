import { ConfigService } from '@/core/config';
import { PrismaService } from '@/core/prisma';
import {
  EVENTS,
  type BatchStatusChangedPayload,
  type JobStatusChangedPayload,
  type TaskStatusChangedPayload,
} from '@/core/monitoring/monitoring.events';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import {
  buildJobOrder,
  parseSensingFromName,
  type ResolvedInputFile,
  type TaskTableConfig,
} from './job-order';

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
  // The script's artifact type, never the host-only `Kubernetes` capability —
  // a Kubernetes host serves these Docker (OCI) dispatches transparently.
  runtime: Exclude<ContainerRuntime, 'Kubernetes'>;
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
// Baked Warhol/dpmc_io scripts live at this in-image prefix (see
// data/warhol/Dockerfile). They use the same `--output` + dpmc_io contract as
// `/app` bind-mounted dev scripts, but need no host mounts — so they run on the
// Kubernetes backend, where bind-mount sources have nowhere to come from.
const BAKED_SCRIPT_DIR = '/dpmc/scripts';

/**
 * Three execution shapes, distinguished by where the executable lives:
 * - `mounted`  — `/app/…`: dev bind-mount of `data/warhol/<exe>/<ver>` +
 *   `_lib`; `--output` + dpmc_io self-fetch. Host mounts only work on Docker.
 * - `baked`    — `/dpmc/scripts/…`: same dpmc_io contract, script + `_lib`
 *   baked into the image; only the `/work` run dir is mounted. Runs anywhere.
 * - `positional` — anything else (self-contained processor image): the worker
 *   stages inputs to `/work/input` and the script takes `<input_dir>
 *   <output_dir>` positionally.
 */
type ExecutableMode = 'mounted' | 'baked' | 'positional';
function executableMode(scriptPath: string): ExecutableMode {
  if (scriptPath.startsWith(SCRIPT_TARGET_DIR + '/')) return 'mounted';
  if (scriptPath.startsWith(BAKED_SCRIPT_DIR + '/')) return 'baked';
  return 'positional';
}

/** Static-volume request a chain node may declare in its configuration. */
interface StaticVolumeRequest {
  /** Name resolved against the DPMC_STATIC_VOLUMES `name=hostPath` map. */
  name: string;
  /** Container-side mount target. */
  target: string;
  readOnly?: boolean;
}

/** Parse the DPMC_STATIC_VOLUMES `name=path,name=path` config value. */
export function parseStaticVolumes(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  return map;
}

/** Quote a token for safe inclusion in a `sh -c` command line. */
function shellQuote(token: string): string {
  return /^[A-Za-z0-9@%+=:,./_-]+$/.test(token)
    ? token
    : `'${token.replaceAll("'", `'\\''`)}'`;
}

/**
 * Join a multi-executable script version (e.g. an IPF task table whose pools
 * are sequenced executables) into a single `sh -c` chain: each executable
 * runs in `(stage, sequence)` order and `&&` stops the chain at the first
 * non-zero exit. Starts with `cd /work` so executables writing relative
 * paths land in the staged run directory.
 *
 * With `jobOrderPath`, every step receives the job order as its single
 * positional argument (the IPF invocation contract). With `logFile`, all
 * step output is captured there — it becomes the IPF_REPORT_GENERATOR's LOG
 * input — then echoed to stdout so container logs stay useful, while the
 * first failing step's exit code still fails the chain.
 */
export function buildExecutableChain(
  executables: Array<{
    scriptType: ScriptType;
    path: string;
    args: string | null;
  }>,
  opts: { jobOrderPath?: string; logFile?: string } = {},
): string {
  const steps = executables.map((exe) => {
    const interpreter = INTERPRETERS[exe.scriptType];
    const flags = exe.args ? exe.args.split(/\s+/).filter(Boolean) : [];
    return [
      ...(interpreter ? [interpreter] : []),
      exe.path,
      ...flags,
      ...(opts.jobOrderPath ? [opts.jobOrderPath] : []),
    ]
      .map(shellQuote)
      .join(' ');
  });
  if (opts.logFile) {
    const log = shellQuote(opts.logFile);
    return (
      `cd ${WORKDIR_TARGET} && { ${steps.join(' && ')}; } >> ${log} 2>&1; ` +
      `rc=$?; cat ${log}; exit $rc`
    );
  }
  return [`cd ${WORKDIR_TARGET}`, ...steps].join(' && ');
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

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

      const nodeConfig = batch?.processingChainId
        ? await tx.processingChain.findUnique({
            where: { id: batch.processingChainId },
            select: { configuration: true },
          })
        : null;
      const nodeCfg = nodeConfig?.configuration as {
        taskTable?: TaskTableConfig;
        staticVolumes?: StaticVolumeRequest[];
      } | null;
      const taskTable = nodeCfg?.taskTable;

      // Resolve the node's declared static volumes against the configured
      // name → host-path map; unknown names are logged and skipped so a
      // mis-configured environment fails loudly in the job, not silently.
      const volumeMap = parseStaticVolumes(
        this.config.get('DPMC_STATIC_VOLUMES') || '',
      );
      const extraMounts: DispatchMount[] = [];
      for (const req of nodeCfg?.staticVolumes ?? []) {
        const source = volumeMap.get(req.name);
        if (!source) {
          this.logger.warn(
            `Job ${row.id}: static volume '${req.name}' is not configured in DPMC_STATIC_VOLUMES — mount skipped`,
          );
          continue;
        }
        extraMounts.push({
          source,
          target: req.target,
          readOnly: req.readOnly ?? true,
        });
      }

      // Stage-in shapes:
      // - IPF task-table nodes: DB input Products are downloaded to
      //   `/work/input/<name>` and a generated Ipf_Job_Order is staged as
      //   inline content; every executable gets its path as positional arg.
      // - positional self-contained processors: DatasetIn Products downloaded
      //   to `/work/input` (no job order).
      // - dpmc_io scripts (mounted `/app` or baked `/dpmc/scripts`): fetch
      //   their own inputs from the API at runtime, no worker-side staging.
      const exe = psv.executables[0];
      const mode = exe ? executableMode(exe.path) : 'positional';
      let stageIn: StageInEntry[] = [];
      let jobOrderPath: string | undefined;
      if (taskTable) {
        const inputs = await this.resolveTaskTableInputs(tx, row.batchId);
        const filesByType = new Map<string, ResolvedInputFile[]>();
        for (const input of inputs) {
          // EE products come as .DBL/.HDR pairs ingested as sibling
          // Products; both are staged, but the reference job orders list
          // only the data file — processors derive the header path.
          if (input.name.toUpperCase().endsWith('.HDR')) continue;
          const files = filesByType.get(input.acronym) ?? [];
          files.push({
            path: `${WORKDIR_TARGET}/${input.localName}`,
            ...(parseSensingFromName(input.name) ?? {}),
          });
          filesByType.set(input.acronym, files);
        }
        const jobOrder = buildJobOrder({
          taskTable,
          filesByType,
          processingStation:
            this.config.get('IPF_PROCESSING_STATION') || 'DPMC',
          workdir: WORKDIR_TARGET,
        });
        if (jobOrder.missingMandatory.length > 0) {
          this.logger.warn(
            `Job ${row.id} (${taskTable.processorName}): no staged Product for mandatory inputs ${jobOrder.missingMandatory.join(', ')}`,
          );
        }
        const jobOrderName = `JobOrder.${row.id}.xml`;
        jobOrderPath = `${WORKDIR_TARGET}/${jobOrderName}`;
        stageIn = [
          ...inputs.map(({ url, localName, role }) => ({
            url,
            localName,
            role,
          })),
          { content: jobOrder.xml, localName: jobOrderName },
        ];
      } else if (mode === 'positional') {
        stageIn = await this.resolveStageInDir(tx, row.batchId);
      }

      const { command, mounts } = this.buildExecution({
        batchId: row.batchId,
        scriptAcronym: psv.processingScript.acronym,
        scriptVersion: psv.version,
        executables: psv.executables,
        stageOut,
        jobOrderPath,
        extraMounts,
      });

      return {
        jobId: row.id,
        image: resolvedImage,
        // psv.runtime is the broad Prisma enum, but a ProcessingScriptVersion
        // only ever declares an artifact type (Docker/Apptainer/None) — the
        // host-only `Kubernetes` capability is never stored here.
        runtime: psv.runtime as Exclude<ContainerRuntime, 'Kubernetes'>,
        command,
        env: {
          // dpmc_io scripts import the shared `dpmc_io` lib from /dpmc_lib —
          // bind-mounted there by buildExecution() for `/app` dev scripts, or
          // baked there in the image for `/dpmc/scripts` scripts. Pin it on the
          // import path either way. Positional processors get their own image's
          // PYTHONPATH left alone.
          ...(mode === 'positional' ? {} : { PYTHONPATH: '/dpmc_lib' }),
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
   * Like {@link resolveStageInDir} but keyed for job-order generation: each
   * staged Product carries its type acronym (to group inputs by File_Type)
   * and its name (to parse the sensing interval).
   */
  private async resolveTaskTableInputs(
    tx: Prisma.TransactionClient,
    batchId: number,
  ): Promise<
    Array<{
      url: string;
      localName: string;
      role: string | null;
      acronym: string;
      name: string;
    }>
  > {
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
                    productType: { select: { acronym: true } },
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

    const out: Array<{
      url: string;
      localName: string;
      role: string | null;
      acronym: string;
      name: string;
    }> = [];
    for (const { dataset } of ins) {
      for (const { role, product } of dataset.products) {
        const url = product.mediaCatalogEntries[0]?.mediaCatalogEntry.path;
        if (!url) continue;
        // Chain-produced Products are named `<batchId>-out-<file>` for
        // uniqueness, but the staged copy must keep its Earth-Explorer file
        // name — processors parse type/validity out of it. The S3 key ends
        // with the original file name, so stage under its basename.
        const fileName = url.split('/').pop() || product.name;
        out.push({
          url,
          localName: `input/${fileName}`,
          role,
          acronym: product.productType.acronym,
          name: fileName,
        });
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
   * Build the container command and mounts for a job. The shape depends on the
   * executable's {@link executableMode}:
   * - `mounted`/`baked` (Warhol dpmc_io): the API auto-appends `--output` from
   *   `ProcessingChain.outputs`; the script fetches its own inputs from the API
   *   (DPMC_BATCH_ID + DPMC_API_URL env) and downloads Products directly. The
   *   `mounted` dev variant bind-mounts the script (`/app`) + `_lib`; the
   *   `baked` variant ships them in the image, so only `/work` is mounted.
   * - `positional` (self-contained processor): positional `<input_dir>
   *   <output_dir>` args, with inputs staged in by the worker.
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
    /** Set for IPF task-table jobs — see the job-order branch below. */
    jobOrderPath?: string;
    /** Node-declared static volumes, already resolved to host paths. */
    extraMounts?: DispatchMount[];
  }): {
    command: string[];
    mounts: DispatchMount[];
  } {
    const warholRoot =
      this.config.get('WARHOL_DATA_ROOT') ||
      path.join(process.cwd(), 'data/warhol');

    const exe = args.executables[0];
    if (!exe) return { command: [], mounts: [] };

    const workdirSource = path.join(warholRoot, 'runs', String(args.batchId));

    const extraMounts = args.extraMounts ?? [];

    if (args.jobOrderPath) {
      // IPF task-table job: run the sequenced executables against the staged
      // job order, capturing all output into /work/LOG (the report
      // generator's input). Binaries are baked into the image — only the
      // /work run dir (plus any node-declared static volumes) is mounted.
      return {
        command: [
          '/bin/sh',
          '-c',
          buildExecutableChain(args.executables, {
            jobOrderPath: args.jobOrderPath,
            logFile: `${WORKDIR_TARGET}/LOG`,
          }),
        ],
        mounts: [
          { source: workdirSource, target: WORKDIR_TARGET },
          ...extraMounts,
        ],
      };
    }

    if (args.executables.length > 1) {
      // Multi-executable script (IPF task-table pools mapped to sequenced
      // executables): backends pass `command` verbatim as the container
      // argv, so the sequential run is encoded as one `sh -c` chain. Only
      // the /work run dir is mounted — multi-executable scripts are baked
      // into the image, and the single-executable dpmc_io `--output` and
      // mounted-mode dev bind-mount contracts don't apply.
      return {
        command: ['/bin/sh', '-c', buildExecutableChain(args.executables)],
        mounts: [
          { source: workdirSource, target: WORKDIR_TARGET },
          ...extraMounts,
        ],
      };
    }

    const interpreter = INTERPRETERS[exe.scriptType];
    const scriptFlags = exe.args ? exe.args.split(/\s+/).filter(Boolean) : [];
    const command = [
      ...(interpreter ? [interpreter] : []),
      exe.path,
      ...scriptFlags,
    ];

    const mode = executableMode(exe.path);

    if (mode === 'positional') {
      // Self-contained processor: positional args <input_dir> <output_dir>.
      command.push(
        path.join(WORKDIR_TARGET, 'input'),
        path.join(WORKDIR_TARGET, 'out'),
      );
      return {
        command,
        mounts: [
          { source: workdirSource, target: WORKDIR_TARGET },
          ...extraMounts,
        ],
      };
    }

    // dpmc_io contract (mounted dev or baked image): the script self-fetches
    // inputs and writes to the auto-appended `--output` path; the worker
    // stages the result out afterwards.
    const out = args.stageOut[0];
    if (out) {
      command.push('--output', path.join(WORKDIR_TARGET, out.localName));
    }

    const mounts: DispatchMount[] = [
      { source: workdirSource, target: WORKDIR_TARGET },
    ];
    if (mode === 'mounted') {
      // Dev-only bind mounts; baked images already contain the script + _lib.
      const scriptSource = path.join(warholRoot, exe.name, args.scriptVersion);
      const libSource = path.join(warholRoot, '_lib');
      mounts.unshift(
        { source: scriptSource, target: SCRIPT_TARGET_DIR, readOnly: true },
        { source: libSource, target: '/dpmc_lib', readOnly: true },
      );
    }
    mounts.push(...extraMounts);

    return { command, mounts };
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

    const now = new Date();

    // No Prometheus read here: the job's last scrape hasn't happened yet.
    // EnergyReconcilerService picks it up a minute later.
    const m = { ...(body.metrics ?? {}) };
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
            Object.keys(m).length === 0
              ? Prisma.JsonNull
              : (m as Prisma.InputJsonValue),
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

    // A failed batch does NOT doom the whole task: the dispatcher's
    // dependency pass walks the DAG per edge (OnSuccess children of the
    // failed branch get Skipped, OnCompletion merges still run) and its
    // finalizer seals the resulting batches — so siblings of a failed
    // branch must be left alone here, not cascade-cancelled.
    if (!allTerminal) return null;

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
            ...(levelOverride ? { processingLevel: levelOverride.level } : {}),
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

        const product = await this.prisma.product.upsert({
          where: { name_version: { name, version: '' } },
          update: { parentBatchId: job.batch.id },
          create: {
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
