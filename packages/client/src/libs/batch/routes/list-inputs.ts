import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchInputEntrySchema } from '../schemas';

export const ListBatchInputsResponse200Schema = ApiResponseSchema.extend({
  data: z.array(BatchInputEntrySchema),
});
export type ListBatchInputsResponse200 = z.infer<
  typeof ListBatchInputsResponse200Schema
>;

export const ListBatchInputsRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.LIST_INPUTS,
  responses: {
    200: ListBatchInputsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
