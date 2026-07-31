import {
  ListAuditLogQuerySchema,
  ListAuditLogResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// GET /audit-log
export const ListAuditLogQueryValidationSchema = ListAuditLogQuerySchema;
export class ListAuditLogQueryDto extends createZodDto(
  ListAuditLogQueryValidationSchema,
) {}

export const ListAuditLogResponseSchema = ListAuditLogResponse200Schema;
export class ListAuditLogResponse extends createZodDto(
  ListAuditLogResponseSchema,
) {}
