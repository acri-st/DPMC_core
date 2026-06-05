import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const host = c.router({
  list: $.ListHostRoute,
  get: $.GetHostRoute,
  register: $.RegisterHostRoute,
  heartbeat: $.HeartbeatHostRoute,
  updateStatus: $.UpdateHostStatusRoute,
  ingestLogs: $.IngestHostLogsRoute,
  listLogs: $.ListHostLogsRoute,
  listBatches: $.ListHostBatchesRoute,
});
