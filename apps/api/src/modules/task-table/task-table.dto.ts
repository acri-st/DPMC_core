import {
  CommitTaskTableResponse200Schema,
  GetTaskTableImportResponse200Schema,
  ImportTaskTableBodySchema,
  ImportTaskTableResponse201Schema,
  ListTaskTableImportResponse200Schema,
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

// GET /task-table/import
export const ListTaskTableImportResponseSchema =
  ListTaskTableImportResponse200Schema;
export class ListTaskTableImportResponse extends createZodDto(
  ListTaskTableImportResponseSchema,
) {}

// GET /task-table/import/:planId
export const GetTaskTableImportResponseSchema =
  GetTaskTableImportResponse200Schema;
export class GetTaskTableImportResponse extends createZodDto(
  GetTaskTableImportResponseSchema,
) {}
