import { z } from 'zod';
import { ApiResponseSchema, Error404Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostLogSchema } from '../schemas';

export const ListHostLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  before: z.coerce.date().optional(),
});

export type ListHostLogsQuery = z.infer<typeof ListHostLogsQuerySchema>;

export const ListHostLogsResponse200Schema = ApiResponseSchema.extend({
  data: z.object({
    logs: z.array(HostLogSchema),
    nextBefore: z.coerce.date().nullable(),
  }),
});

export const ListHostLogsResponse404Schema = Error404Schema;

export type ListHostLogsResponse200 = z.infer<
  typeof ListHostLogsResponse200Schema
>;
export type ListHostLogsResponse404 = z.infer<
  typeof ListHostLogsResponse404Schema
>;
export type ListHostLogsResponse =
  | ListHostLogsResponse200
  | ListHostLogsResponse404;

export const ListHostLogsRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.LIST_LOGS,
  query: ListHostLogsQuerySchema,
  responses: {
    200: ListHostLogsResponse200Schema,
    404: ListHostLogsResponse404Schema,
  },
};
