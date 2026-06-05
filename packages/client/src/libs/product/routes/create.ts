import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateProductBodySchema, ProductSchema } from '../schemas';

export const CreateProductResponse201Schema = ApiResponseSchema.extend({
  data: ProductSchema,
});

export type CreateProductResponse201 = z.infer<
  typeof CreateProductResponse201Schema
>;

export const CreateProductRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCT.CREATE,
  body: CreateProductBodySchema,
  responses: {
    201: CreateProductResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
