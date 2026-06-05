import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductSchema } from '../schemas';

export const ListProductResponse200Schema = ApiResponseSchema.extend({
  data: ProductSchema.array(),
});

export type ListProductResponse200 = z.infer<
  typeof ListProductResponse200Schema
>;

export const ListProductRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT.LIST,
  responses: {
    200: ListProductResponse200Schema,
    500: Error500Schema,
  },
};
