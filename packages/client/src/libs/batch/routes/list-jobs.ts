import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchJobSchema } from '../schemas';

export const ListBatchJobsResponse200Schema = ApiResponseSchema.extend({
  data: z.array(BatchJobSchema),
});
export type ListBatchJobsResponse200 = z.infer<
  typeof ListBatchJobsResponse200Schema
>;

export const ListBatchJobsRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.LIST_JOBS,
  responses: {
    200: ListBatchJobsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
