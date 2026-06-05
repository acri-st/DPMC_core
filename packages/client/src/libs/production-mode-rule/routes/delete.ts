import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProductionModeRuleResponse204Schema = ApiResponseSchema;

export type DeleteProductionModeRuleResponse204 = z.infer<
  typeof DeleteProductionModeRuleResponse204Schema
>;

export const DeleteProductionModeRuleRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_MODE_RULE.DELETE,
  responses: {
    204: DeleteProductionModeRuleResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
