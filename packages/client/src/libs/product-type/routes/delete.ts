import { z } from 'zod';
import {
  ApiResponseSchema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProductTypeResponse204Schema = ApiResponseSchema;

export type DeleteProductTypeResponse204 = z.infer<
  typeof DeleteProductTypeResponse204Schema
>;

export const DeleteProductTypeRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCT_TYPE.DELETE,
  responses: {
    204: DeleteProductTypeResponse204Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
