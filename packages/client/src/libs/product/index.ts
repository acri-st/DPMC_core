import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const product = c.router({
  list: $.ListProductRoute,
  get: $.GetProductRoute,
  create: $.CreateProductRoute,
  update: $.UpdateProductRoute,
  delete: $.DeleteProductRoute,
});
