import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema } from '../../batch/schemas';

export const ListHostBatchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListHostBatchesQuery = z.infer<typeof ListHostBatchesQuerySchema>;

export const HostBatchSummarySchema = z.object({
  batch: BatchSchema,
  jobsOnHost: z.number().int(),
  lastJobEndedAt: z.coerce.date().nullable(),
  lastJobStartedAt: z.coerce.date().nullable(),
});
export type HostBatchSummary = z.infer<typeof HostBatchSummarySchema>;

export const ListHostBatchesResponse200Schema = ApiResponseSchema.extend({
  data: HostBatchSummarySchema.array(),
});
export type ListHostBatchesResponse200 = z.infer<
  typeof ListHostBatchesResponse200Schema
>;

export const ListHostBatchesRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.LIST_BATCHES,
  query: ListHostBatchesQuerySchema,
  responses: {
    200: ListHostBatchesResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
