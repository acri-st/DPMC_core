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
  ProductionChainSchema,
  UpdateProductionChainRequestSchema,
} from '../schemas';

export const UpdateProductionChainResponse200Schema = ApiResponseSchema.extend({
  data: ProductionChainSchema,
});

export type UpdateProductionChainResponse200 = z.infer<
  typeof UpdateProductionChainResponse200Schema
>;

export const UpdateProductionChainRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCTION_CHAIN.UPDATE,
  body: UpdateProductionChainRequestSchema,
  responses: {
    200: UpdateProductionChainResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
