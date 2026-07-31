import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const taskTable = c.router({
  import: $.ImportTaskTableRoute,
  commit: $.CommitTaskTableRoute,
  history: $.ListTaskTableImportRoute,
  historyGet: $.GetTaskTableImportRoute,
});
