import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const productionModeRule = c.router({
  list: $.ListProductionModeRuleRoute,
  get: $.GetProductionModeRuleRoute,
  create: $.CreateProductionModeRuleRoute,
  update: $.UpdateProductionModeRuleRoute,
  delete: $.DeleteProductionModeRuleRoute,
});
