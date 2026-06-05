import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const processingScript = c.router({
  list: $.ListProcessingScriptRoute,
  get: $.GetProcessingScriptRoute,
});
