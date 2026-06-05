import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const batch = c.router({
  list: $.ListBatchRoute,
  get: $.GetBatchRoute,
  create: $.CreateBatchRoute,
  replay: $.ReplayBatchRoute,
});
