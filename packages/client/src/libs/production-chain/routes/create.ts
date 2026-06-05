import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  CreateProductionChainRequestSchema,
  ProductionChainSchema,
} from '../schemas';

export const CreateProductionChainResponse201Schema = ApiResponseSchema.extend({
  data: ProductionChainSchema,
});

export type CreateProductionChainResponse201 = z.infer<
  typeof CreateProductionChainResponse201Schema
>;

export const CreateProductionChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.CREATE,
  body: CreateProductionChainRequestSchema,
  responses: {
    201: CreateProductionChainResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
