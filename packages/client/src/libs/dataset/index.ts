import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const dataset = c.router({
  list: $.ListDatasetRoute,
  get: $.GetDatasetRoute,
  create: $.CreateDatasetRoute,
  update: $.UpdateDatasetRoute,
  delete: $.DeleteDatasetRoute,
});
