import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const processorVersion = c.router({
  list: $.ListProcessorVersionRoute,
  get: $.GetProcessorVersionRoute,
  create: $.CreateProcessorVersionRoute,
  update: $.UpdateProcessorVersionRoute,
  delete: $.DeleteProcessorVersionRoute,
});
