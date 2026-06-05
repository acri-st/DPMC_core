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

export async function resolveDataCenterCode(): Promise<string> {
  return DATA_CENTER_CODE;
}

/**
 * Default register payload aligned with RegisterHostBodySchema.
 * Pass dataCenterCode explicitly (from resolveDataCenterCode()) to avoid
 * hardcoded fixture values that may not exist in the dev database.
 */
export function registerPayload(hostname: string, dataCenterCode = 'ACR') {
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
