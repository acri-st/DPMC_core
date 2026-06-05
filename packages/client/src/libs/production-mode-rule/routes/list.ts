import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductionModeRuleSchema } from '../schemas';

export const ListProductionModeRuleResponse200Schema = ApiResponseSchema.extend(
  {
    data: ProductionModeRuleSchema.array(),
  },
);

export type ListProductionModeRuleResponse200 = z.infer<
  typeof ListProductionModeRuleResponse200Schema
>;

export const ListProductionModeRuleRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCTION_MODE_RULE.LIST,
  responses: {
    200: ListProductionModeRuleResponse200Schema,
    500: Error500Schema,
  },
};
