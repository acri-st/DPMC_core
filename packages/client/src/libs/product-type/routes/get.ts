import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductTypeSchema } from '../schemas';

export const GetProductTypeResponse200Schema = ApiResponseSchema.extend({
  data: ProductTypeSchema,
});

export type GetProductTypeResponse200 = z.infer<
  typeof GetProductTypeResponse200Schema
>;

export const GetProductTypeRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT_TYPE.GET,
  responses: {
    200: GetProductTypeResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
