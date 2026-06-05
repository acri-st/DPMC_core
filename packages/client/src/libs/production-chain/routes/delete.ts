import { z } from 'zod';
import {
  ApiResponseSchema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProductionChainResponse204Schema = ApiResponseSchema;

export type DeleteProductionChainResponse204 = z.infer<
  typeof DeleteProductionChainResponse204Schema
>;

export const DeleteProductionChainRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_CHAIN.DELETE,
  responses: {
    204: DeleteProductionChainResponse204Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
