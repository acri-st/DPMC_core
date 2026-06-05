import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  ProductionModeRuleSchema,
  UpdateProductionModeRuleBodySchema,
} from '../schemas';

export const UpdateProductionModeRuleResponse200Schema =
  ApiResponseSchema.extend({
    data: ProductionModeRuleSchema,
  });

export type UpdateProductionModeRuleResponse200 = z.infer<
  typeof UpdateProductionModeRuleResponse200Schema
>;

export const UpdateProductionModeRuleRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCTION_MODE_RULE.UPDATE,
  body: UpdateProductionModeRuleBodySchema,
  responses: {
    200: UpdateProductionModeRuleResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
