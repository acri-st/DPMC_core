import { CONFIG } from '../../constants/config';
import { withDbClient } from '../t03/_shared';

export interface OrderedAllocation {
  allocationId: number;
  taskId: number;
  hostId: number;
}

/**
 * Placements for `taskIds` in the order the scheduler made them.
 *
 * Ordering by allocation id is the observable form of the dispatcher's
 * priority sort (domain/dispatch.sort_ready_jobs): when capacity only fits one
 * job at a time, the sequence of allocations is the execution order.
 */
export async function allocationOrder(
  taskIds: number[],
): Promise<OrderedAllocation[]> {
  if (taskIds.length === 0) return [];
  return withDbClient(async (c) => {
    const res = await c.query(
      `SELECT a.id AS "allocationId", b."taskId", a."hostId"
       FROM "job_x_allocation" a
       JOIN "job" j   ON j.id = a."jobId"
       JOIN "batch" b ON b.id = j."batchId"
       WHERE b."taskId" = ANY($1::int[])
       ORDER BY a.id`,
      [taskIds],
    );
    return res.rows as OrderedAllocation[];
  });
}

/** Poll until every task has produced a Ready job, so none is placed before the others exist. */
export async function waitForReadyJobs(
  taskIds: number[],
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let seen = 0;
  while (Date.now() < deadline) {
    seen = await withDbClient(async (c) => {
      const res = await c.query(
        `SELECT COUNT(DISTINCT b."taskId")::int AS n
         FROM "job" j
         JOIN "batch" b ON b.id = j."batchId"
         WHERE b."taskId" = ANY($1::int[]) AND j.status = 'ready'`,
        [taskIds],
      );
      return res.rows[0].n as number;
    });
    if (seen >= taskIds.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `only ${seen}/${taskIds.length} tasks reached a Ready job within ${timeoutMs}ms`,
  );
}

/**
 * Backdate a task's jobs so the dispatcher sees them as having waited.
 *
 * `effective_priority` derives its ageing term from `job.createdAt`
 * (services/aging.py reads it as ready_since_ms). Ageing is 0.01 per second,
 * so overtaking a higher class by waiting takes hours of wall clock —
 * backdating is what makes the behaviour observable in a test.
 */
export async function backdateJobs(
  taskIds: number[],
  seconds: number,
): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE "job" SET "createdAt" = NOW() - ($2 || ' seconds')::interval
       WHERE "batchId" IN (SELECT id FROM "batch" WHERE "taskId" = ANY($1::int[]))`,
      [taskIds, String(seconds)],
    );
  });
}

/** Create a project with an explicit scheduling weight. */
export async function createProject(
  cookie: string,
  identifier: string,
  priorityWeight: number,
): Promise<number> {
  const res = await fetch(`${CONFIG.api.url}/project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      identifier,
      name: `${identifier} (weight ${priorityWeight})`,
      priorityWeight,
      // A project rejects any production mode it does not list, and the
      // default is an empty list.
      allowedProductionModes: ['Nominal'],
    }),
  });
  if (res.status !== 201) {
    throw new Error(`POST /project -> ${res.status}: ${await res.text()}`);
  }
  return ((await res.json()) as { data: { id: number } }).data.id;
}

/**
 * Point the session at `projectId` before creating a task in it.
 *
 * A task is created in the caller's *current* project, resolved by
 * ProjectScopeGuard from UserSettings.lastProjectId — the `projectId` in a
 * POST /task body is not what decides it. Switching the session setting is the
 * only way to place a task in a chosen project.
 */
export async function selectProject(
  cookie: string,
  projectId: number,
): Promise<void> {
  const res = await fetch(`${CONFIG.api.url}/user/me/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ lastProjectId: projectId }),
  });
  if (!res.ok) {
    throw new Error(
      `PATCH /user/me/settings -> ${res.status}: ${await res.text()}`,
    );
  }
}

/** The dispatcher's ageing cap, mirrored from apps/dispatcher domain/dispatch.py. */
export const AGING_COEF = 0.01;
export const AGING_CAP_S = 86_400;
