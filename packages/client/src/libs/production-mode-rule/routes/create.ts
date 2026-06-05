import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  CreateProductionModeRuleBodySchema,
  ProductionModeRuleSchema,
} from '../schemas';

export const CreateProductionModeRuleResponse201Schema =
  ApiResponseSchema.extend({
    data: ProductionModeRuleSchema,
  });

export type CreateProductionModeRuleResponse201 = z.infer<
  typeof CreateProductionModeRuleResponse201Schema
>;

export const CreateProductionModeRuleRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_MODE_RULE.CREATE,
  body: CreateProductionModeRuleBodySchema,
  responses: {
    201: CreateProductionModeRuleResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
