import {
  CommitTaskTableResponse200Schema,
  ImportTaskTableBodySchema,
  ImportTaskTableResponse201Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// POST /task-table/import
export const ImportTaskTableBodyValidationSchema = ImportTaskTableBodySchema;
export class ImportTaskTableBodyDto extends createZodDto(
  ImportTaskTableBodyValidationSchema,
) {}

export const ImportTaskTableResponseSchema = ImportTaskTableResponse201Schema;
export class ImportTaskTableResponse extends createZodDto(
  ImportTaskTableResponseSchema,
) {}

// POST /task-table/import/:planId/commit
export const CommitTaskTableResponseSchema = CommitTaskTableResponse200Schema;
export class CommitTaskTableResponse extends createZodDto(
  CommitTaskTableResponseSchema,
) {}
