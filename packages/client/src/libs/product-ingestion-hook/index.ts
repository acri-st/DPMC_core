import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const productIngestionHook = c.router({
  list: $.ListProductIngestionHookRoute,
  get: $.GetProductIngestionHookRoute,
  create: $.CreateProductIngestionHookRoute,
  update: $.UpdateProductIngestionHookRoute,
  delete: $.DeleteProductIngestionHookRoute,
});
