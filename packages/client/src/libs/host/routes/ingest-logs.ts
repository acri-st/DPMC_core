import { z } from 'zod';
import { ApiResponseSchema, Error401Schema, Error404Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostLogEntrySchema } from '../schemas';

export const IngestHostLogsBodySchema = z.object({
  logs: z.array(HostLogEntrySchema).min(1).max(1000),
});

export type IngestHostLogsBody = z.infer<typeof IngestHostLogsBodySchema>;

export const IngestHostLogsResponse200Schema = ApiResponseSchema.extend({
  data: z.object({
    accepted: z.number().int().nonnegative(),
  }),
});

export const IngestHostLogsResponse401Schema = Error401Schema;
export const IngestHostLogsResponse404Schema = Error404Schema;

export type IngestHostLogsResponse200 = z.infer<
  typeof IngestHostLogsResponse200Schema
>;
export type IngestHostLogsResponse401 = z.infer<
  typeof IngestHostLogsResponse401Schema
>;
export type IngestHostLogsResponse404 = z.infer<
  typeof IngestHostLogsResponse404Schema
>;
export type IngestHostLogsResponse =
  | IngestHostLogsResponse200
  | IngestHostLogsResponse401
  | IngestHostLogsResponse404;

export const IngestHostLogsRoute = {
  method: METHODS.POST,
  path: PATHS.HOST.INGEST_LOGS,
  body: IngestHostLogsBodySchema,
  responses: {
    200: IngestHostLogsResponse200Schema,
    401: IngestHostLogsResponse401Schema,
    404: IngestHostLogsResponse404Schema,
  },
};
