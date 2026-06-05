import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateProductTypeBodySchema, ProductTypeSchema } from '../schemas';

export const CreateProductTypeResponse201Schema = ApiResponseSchema.extend({
  data: ProductTypeSchema,
});

export type CreateProductTypeResponse201 = z.infer<
  typeof CreateProductTypeResponse201Schema
>;

export const CreateProductTypeRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCT_TYPE.CREATE,
  body: CreateProductTypeBodySchema,
  responses: {
    201: CreateProductTypeResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
