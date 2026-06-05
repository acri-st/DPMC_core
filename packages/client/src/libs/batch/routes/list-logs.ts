import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostLogSchema } from '../../host/schemas/host-log.schema';

/**
 * Cursor-paginated batch-scoped log feed. `?before=<iso>` returns the
 * window strictly before that timestamp (DESC); the response carries the
 * next cursor so the UI can paginate further back. Default page size is
 * bounded server-side.
 */
export const ListBatchLogsQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  level: z.enum(['Debug', 'Info', 'Warning', 'Error', 'Critical']).optional(),
});
export type ListBatchLogsQuery = z.infer<typeof ListBatchLogsQuerySchema>;

export const ListBatchLogsResponse200Schema = ApiResponseSchema.extend({
  data: z.object({
    logs: z.array(HostLogSchema),
    nextBefore: z.coerce.date().nullable(),
  }),
});
export type ListBatchLogsResponse200 = z.infer<
  typeof ListBatchLogsResponse200Schema
>;

export const ListBatchLogsRoute = {
  method: METHODS.GET,
  path: PATHS.BATCH.LIST_LOGS,
  query: ListBatchLogsQuerySchema,
  responses: {
    200: ListBatchLogsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
