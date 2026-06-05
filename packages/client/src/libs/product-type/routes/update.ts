import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductTypeSchema, UpdateProductTypeBodySchema } from '../schemas';

export const UpdateProductTypeResponse200Schema = ApiResponseSchema.extend({
  data: ProductTypeSchema,
});

export type UpdateProductTypeResponse200 = z.infer<
  typeof UpdateProductTypeResponse200Schema
>;

export const UpdateProductTypeRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCT_TYPE.UPDATE,
  body: UpdateProductTypeBodySchema,
  responses: {
    200: UpdateProductTypeResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
