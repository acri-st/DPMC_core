import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const dataCenter = c.router({
  list: $.ListDataCenterRoute,
  get: $.GetDataCenterRoute,
});
