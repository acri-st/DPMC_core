import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductTypeSchema } from '../schemas';

export const ListProductTypeResponse200Schema = ApiResponseSchema.extend({
  data: ProductTypeSchema.array(),
});

export const ListProductTypeResponse500Schema = Error500Schema;

export type ListProductTypeResponse200 = z.infer<
  typeof ListProductTypeResponse200Schema
>;
export type ListProductTypeResponse500 = z.infer<
  typeof ListProductTypeResponse500Schema
>;
export type ListProductTypeResponse =
  | ListProductTypeResponse200
  | ListProductTypeResponse500;

export const ListProductTypeRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCT_TYPE.LIST,
  responses: {
    200: ListProductTypeResponse200Schema,
    500: ListProductTypeResponse500Schema,
  },
};
