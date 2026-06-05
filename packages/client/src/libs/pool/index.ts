import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const pool = c.router({
  list: $.ListPoolRoute,
  get: $.GetPoolRoute,
  create: $.CreatePoolRoute,
  update: $.UpdatePoolRoute,
  delete: $.DeletePoolRoute,
  addHost: $.AddPoolHostRoute,
  removeHost: $.RemovePoolHostRoute,
});
