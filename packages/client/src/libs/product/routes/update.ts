import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductSchema, UpdateProductBodySchema } from '../schemas';

export const UpdateProductResponse200Schema = ApiResponseSchema.extend({
  data: ProductSchema,
});

export type UpdateProductResponse200 = z.infer<
  typeof UpdateProductResponse200Schema
>;

export const UpdateProductRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCT.UPDATE,
  body: UpdateProductBodySchema,
  responses: {
    200: UpdateProductResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
