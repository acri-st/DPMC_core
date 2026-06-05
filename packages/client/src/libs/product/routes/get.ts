import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductSchema } from '../schemas';

export const GetProductResponse200Schema = ApiResponseSchema.extend({
  data: ProductSchema,
});

export type GetProductResponse200 = z.infer<typeof GetProductResponse200Schema>;

export const GetProductRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT.GET,
  responses: {
    200: GetProductResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
