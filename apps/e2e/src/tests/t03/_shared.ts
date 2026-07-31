import { Client } from 'pg';
import { CONFIG } from '../../constants/config';
import { FIXTURES } from '../../setup/fixtures';

export const PROJECT_ID           = FIXTURES.project.id;
export const PROCESSOR_VERSION_ID = FIXTURES.processorVersion.id;
export const DATA_CENTER_CODE     = FIXTURES.dataCenter.code;

export const WORKER_HEADER = CONFIG.worker.headerName;
export const WORKER_SECRET = CONFIG.worker.registrationToken;
export const workerHeader = () => ({ [WORKER_HEADER]: WORKER_SECRET });

export async function withDbClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export async function deleteHost(hostname: string) {
  await withDbClient(async (c) => {
    // job_x_allocation.hostId is ON DELETE RESTRICT, so a host that took part
    // in a placement cannot be removed until its allocations are gone.
    await c.query(
      `DELETE FROM "job_x_allocation"
       WHERE "hostId" IN (SELECT id FROM "host" WHERE hostname = $1)`,
      [hostname],
    );
    await c.query(`DELETE FROM "host" WHERE hostname = $1`, [hostname]);
  });
}

export async function setHeartbeat(hostname: string, intervalSql: string) {
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE "host" SET "lastHeartbeatAt" = NOW() - INTERVAL '${intervalSql}' WHERE hostname = $1`,
      [hostname],
    );
  });
}

export function uniqueHostname(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ResourceNeed {
  cores?: number;
  ram?: bigint;
  disk?: bigint;
  runtime?: 'None' | 'Docker' | 'Apptainer' | 'Kubernetes';
  requiresGpu?: boolean;
  gpuCount?: number;
}

/**
 * Provision a ProcessorVersion whose ProcessingScriptVersion carries the given
 * resource requirements, and return its id for POST /task.
 *
 * The dispatcher reads requirements from `processing_script_version`
 * (see apps/dispatcher services/dispatch.py), and no API creates one — the
 * only writer is the Task Table import, which hard-codes 1 core / 0 bytes.
 * Driving node selection therefore means inserting the row directly, the same
 * way this suite already manipulates hosts.
 */
export async function createProcessorVersion(
  label: string,
  need: ResourceNeed = {},
): Promise<{ processorVersionId: number; scriptVersionId: number }> {
  return withDbClient(async (c) => {
    const version = await c.query(
      `INSERT INTO "processing_script_version"
         ("processingScriptId", "version", "runtime", "requiredCpu",
          "requiredRam", "requiredDisk", "requiresGpu", "gpuCount", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        FIXTURES.processingScript.id,
        label,
        // ContainerRuntime is @map'd to lowercase in Postgres, and raw SQL
        // bypasses Prisma's translation.
        (need.runtime ?? 'None').toLowerCase(),
        need.cores ?? 1,
        String(need.ram ?? 0n),
        String(need.disk ?? 0n),
        need.requiresGpu ?? false,
        need.gpuCount ?? 0,
      ],
    );
    const scriptVersionId = version.rows[0].id as number;

    const processor = await c.query(
      `INSERT INTO "processor_x_version"
         ("processingScriptVersionId", "auxiliaryConfigurationId", "baseline")
       VALUES ($1, $2, $3)
       RETURNING id`,
      [scriptVersionId, FIXTURES.auxiliaryConfiguration.id, label],
    );
    return {
      processorVersionId: processor.rows[0].id as number,
      scriptVersionId,
    };
  });
}

export interface Allocation {
  jobId: number;
  hostId: number;
  reservedCpu: number;
  reservedRam: string;
}

/**
 * Poll the scheduler's placement decisions for `taskIds` until `predicate` holds.
 *
 * Two things this deliberately does not do:
 *
 * - It does not read `job.hostId`. That is not the scheduler's decision; it is
 *   set later, when the execution layer picks the job up. The decision is the
 *   row the dispatcher writes into `job_x_allocation`.
 * - It does not filter on `releasedAt`. Jobs in the e2e stack fail almost
 *   immediately (no real processor behind the fixture script) and the finalizer
 *   releases their allocation, so a placement observed in one step would be
 *   gone by the next. The placement decision is what is under test, not how
 *   long it survived.
 *
 * Scoping by task id keeps one spec from seeing another spec's placements —
 * the suite shares a database for the whole run.
 */
export async function waitForAllocations(
  taskIds: number[],
  predicate: (allocs: Allocation[]) => boolean,
  timeoutMs = 60_000,
): Promise<Allocation[]> {
  const deadline = Date.now() + timeoutMs;
  let last: Allocation[] = [];
  while (Date.now() < deadline) {
    last = await withDbClient(async (c) => {
      const res = await c.query(
        `SELECT a."jobId", a."hostId", a."reservedCpu",
                a."reservedRam"::text AS "reservedRam"
         FROM "job_x_allocation" a
         JOIN "job" j   ON j.id = a."jobId"
         JOIN "batch" b ON b.id = j."batchId"
         WHERE b."taskId" = ANY($1::int[])
         ORDER BY a."jobId"`,
        [taskIds],
      );
      return res.rows as Allocation[];
    });
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `waitForAllocations timed out after ${timeoutMs}ms for tasks ${taskIds.join(
      ',',
    )}; last: ${JSON.stringify(last)}`,
  );
}

/**
 * Largest capacity advertised by hosts the test does not own.
 *
 * The e2e stack runs a real worker, and the API sets a host back to Up on every
 * heartbeat (host.service heartbeat), which arrives every few seconds — so
 * taking that host out of scheduling cannot hold for the length of a test.
 * Sizing a requirement above this ceiling is what actually keeps an ambient
 * worker out of the placements under test.
 */
export async function ambientCeiling(
  ownHostnames: string[] = [],
): Promise<{ cores: number; ram: bigint }> {
  return withDbClient(async (c) => {
    const res = await c.query(
      `SELECT COALESCE(MAX("nbCores"), 0) AS cores,
              COALESCE(MAX(ram), 0)::text AS ram
       FROM "host"
       WHERE hostname <> ALL($1::text[])`,
      [ownHostnames],
    );
    return {
      cores: Number(res.rows[0].cores),
      ram: BigInt(res.rows[0].ram),
    };
  });
}

/** Poll GET /job until `predicate` holds, or throw with the last snapshot. */
export async function waitForJobs(
  cookie: string,
  predicate: (jobs: JobRow[]) => boolean,
  timeoutMs = 45_000,
): Promise<JobRow[]> {
  const deadline = Date.now() + timeoutMs;
  let last: JobRow[] = [];
  while (Date.now() < deadline) {
    const res = await fetch(`${CONFIG.api.url}/job`, {
      headers: { Cookie: cookie },
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: JobRow[] };
      last = body.data ?? [];
      if (predicate(last)) return last;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `waitForJobs timed out after ${timeoutMs}ms; last snapshot: ${JSON.stringify(
      last.map((j) => ({ id: j.id, status: j.status, hostId: j.hostId })),
    )}`,
  );
}

export interface JobRow {
  id: number;
  status: string;
  hostId: number | null;
  batchId: number;
}

export interface TaskOptions {
  priority?: number;
  priorityClass?: 'Test' | 'OnDemand' | 'Reprocessing' | 'NRT' | 'Super' | 'Ultra';
  projectId?: number;
}

/** Create a task for `processorVersionId` and trigger it, returning its id. */
export async function createAndTriggerTask(
  cookie: string,
  processorVersionId: number,
  comment: string,
  options: TaskOptions = {},
): Promise<number> {
  const create = await fetch(`${CONFIG.api.url}/task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      projectId: options.projectId ?? PROJECT_ID,
      kind: 'Standalone',
      processorVersionId,
      priority: options.priority ?? 5,
      productionMode: 'Nominal',
      priorityClass: options.priorityClass ?? 'NRT',
      scheduledStartTime: new Date().toISOString(),
      comment,
    }),
  });
  if (create.status !== 201) {
    throw new Error(`POST /task -> ${create.status}: ${await create.text()}`);
  }
  const taskId = ((await create.json()) as { data: { id: number } }).data.id;

  const trigger = await fetch(`${CONFIG.api.url}/task/${taskId}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{}',
  });
  if (trigger.status !== 200) {
    throw new Error(
      `POST /task/${taskId}/trigger -> ${trigger.status}: ${await trigger.text()}`,
    );
  }
  return taskId;
}

/**
 * Retire a spec's jobs so they stop competing for the next spec's nodes.
 *
 * A job whose host was deleted in afterAll stays Ready forever, and the
 * dispatcher keeps re-evaluating it every tick — so it grabs capacity from
 * whichever nodes the *next* spec registers, starving that spec's own tasks.
 * The suite shares one database for the whole run, so each spec has to hand its
 * queue back.
 *
 * Cancelling rather than deleting: the dispatcher only considers Ready jobs, so
 * this takes them out of contention without touching the rows that reference
 * them.
 */
export async function releaseTasks(taskIds: number[]): Promise<void> {
  if (taskIds.length === 0) return;
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE "job" SET status = 'cancelled'
       WHERE status IN ('ready', 'waiting')
         AND "batchId" IN (SELECT id FROM "batch" WHERE "taskId" = ANY($1::int[]))`,
      [taskIds],
    );
  });
}

/**
 * Keep synthetic hosts eligible for the duration of a test.
 *
 * The API flips a host to Off after WORKER_OFFLINE_THRESHOLD_S (15s in e2e)
 * without a heartbeat, and a host registered by a test has no worker process
 * behind it to send one — so it drops out of scheduling mid-test. Returns a
 * stop function to call in afterAll.
 */
export function keepHostsAlive(hostIds: number[], everyMs = 5_000): () => void {
  const ping = () => {
    for (const id of hostIds) {
      void fetch(`${CONFIG.api.url}/host/${id}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...workerHeader() },
        body: JSON.stringify({ cpuLoad: 0.05, memUsage: 0.1, diskUsage: 0.05 }),
      }).catch(() => undefined);
    }
  };
  ping();
  const timer = setInterval(ping, everyMs);
  return () => clearInterval(timer);
}

/**
 * Take every host out of scheduling except those named, so placement is
 * deterministic. HostStatus is @map'd to lowercase in Postgres, and raw SQL
 * bypasses Prisma's translation.
 */
export async function isolateHosts(keepHostnames: string[]): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE "host" SET status = 'off' WHERE hostname <> ALL($1::text[])`,
      [keepHostnames],
    );
  });
}

/** Undo isolateHosts for hosts that are still heart-beating. */
export async function restoreHosts(): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE "host" SET status = 'up'
       WHERE "lastHeartbeatAt" > NOW() - INTERVAL '30 seconds'`,
    );
  });
}

export async function resolveDataCenterCode(): Promise<string> {
  return DATA_CENTER_CODE;
}

/**
 * Default register payload aligned with RegisterHostBodySchema.
 * Defaults to the seeded fixture data center (DATA_CENTER_CODE); pass
 * dataCenterCode explicitly to target a different one.
 */
export function registerPayload(hostname: string, dataCenterCode: string = DATA_CENTER_CODE) {
  return {
    dataCenterCode,
    hostname,
    ipAddress: '10.0.0.1',
    osType: 'Linux',
    osVersion: '6.0',
    processingDir: '/var/processing',
    cacheDir: '/var/cache',
    nbCores: 2,
    ram: 4_000_000_000,
    disk: 20_000_000_000,
    schedulingPriority: 'Medium',
    hasGpu: false,
    gpuCount: 0,
    containerRuntime: 'None',
  };
}
