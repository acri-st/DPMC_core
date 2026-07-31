import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchStatusSummarySchema } from '../schemas';

export const BatchStatusSummaryResponse200Schema = ApiResponseSchema.extend({
  data: BatchStatusSummarySchema,
});
export type BatchStatusSummaryResponse200 = z.infer<
  typeof BatchStatusSummaryResponse200Schema
>;

export const BatchStatusSummaryRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.STATUS_SUMMARY,
  responses: {
    200: BatchStatusSummaryResponse200Schema,
    500: Error500Schema,
  },
};
