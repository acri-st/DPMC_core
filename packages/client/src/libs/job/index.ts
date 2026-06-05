import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const job = c.router({
  list: $.ListJobRoute,
  get: $.GetJobRoute,
});
