import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchProductWithPreviewSchema } from '../schemas';

export const ListBatchProductsResponse200Schema = ApiResponseSchema.extend({
  data: z.array(BatchProductWithPreviewSchema),
});
export type ListBatchProductsResponse200 = z.infer<
  typeof ListBatchProductsResponse200Schema
>;

export const ListBatchProductsRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.LIST_PRODUCTS,
  responses: {
    200: ListBatchProductsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
