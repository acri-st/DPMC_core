import { z } from 'zod';
import {
  ApiResponseSchema,
  Error401Schema,
  Error403Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { AuditLogSchema } from '../schemas';

export const ListAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const ListAuditLogResponse200Schema = ApiResponseSchema.extend({
  data: AuditLogSchema.array(),
});

export const ListAuditLogRoute = {
  method: METHODS.GET,
  path: PATHS.AUDIT_LOG.LIST,
  query: ListAuditLogQuerySchema,
  responses: {
    200: ListAuditLogResponse200Schema,
    401: Error401Schema,
    403: Error403Schema,
    500: Error500Schema,
  },
};
