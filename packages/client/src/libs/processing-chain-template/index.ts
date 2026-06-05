import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const processingChainTemplate = c.router({
  list: $.ListProcessingChainTemplateRoute,
  get: $.GetProcessingChainTemplateRoute,
  create: $.CreateProcessingChainTemplateRoute,
  update: $.UpdateProcessingChainTemplateRoute,
  delete: $.DeleteProcessingChainTemplateRoute,
});
