import { z } from 'zod';
import {
  ApiResponseSchema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProductResponse204Schema = ApiResponseSchema;

export type DeleteProductResponse204 = z.infer<
  typeof DeleteProductResponse204Schema
>;

export const DeleteProductRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCT.DELETE,
  responses: {
    204: DeleteProductResponse204Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
