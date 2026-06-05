import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductionModeRuleSchema } from '../schemas';

export const GetProductionModeRuleResponse200Schema = ApiResponseSchema.extend({
  data: ProductionModeRuleSchema,
});

export type GetProductionModeRuleResponse200 = z.infer<
  typeof GetProductionModeRuleResponse200Schema
>;

export const GetProductionModeRuleRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCTION_MODE_RULE.GET,
  responses: {
    200: GetProductionModeRuleResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
