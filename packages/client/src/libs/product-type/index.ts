import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const productType = c.router({
  list: $.ListProductTypeRoute,
  get: $.GetProductTypeRoute,
  create: $.CreateProductTypeRoute,
  update: $.UpdateProductTypeRoute,
  delete: $.DeleteProductTypeRoute,
});
