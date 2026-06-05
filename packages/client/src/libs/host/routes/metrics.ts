import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostMetricsSchema } from '../schemas';

export const ListHostMetricsQuerySchema = z.object({
  since: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type ListHostMetricsQuery = z.infer<typeof ListHostMetricsQuerySchema>;

export const ListHostMetricsResponse200Schema = ApiResponseSchema.extend({
  data: HostMetricsSchema.array(),
});
export type ListHostMetricsResponse200 = z.infer<
  typeof ListHostMetricsResponse200Schema
>;

export const ListHostMetricsRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.METRICS,
  query: ListHostMetricsQuerySchema,
  responses: {
    200: ListHostMetricsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
