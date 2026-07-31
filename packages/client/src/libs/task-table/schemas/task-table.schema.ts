import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ImportTaskTableBodySchema = z.object({
  adapter: z.string().min(1),
  content: z.string().min(1),
  // Label carried into the ingestion history so an audit can name the document
  // a conversion came from.
  sourceName: z.string().min(1).optional(),
});
export type ImportTaskTableBody = z.infer<typeof ImportTaskTableBodySchema>;

export const ImportTaskTableSummarySchema = z.object({
  adapter: z.string(),
  acceptedCount: z.number().int(),
  rejectedCount: z.number().int(),
});

export const ImportTaskTablePlanSchema = z.object({
  planId: IdSchema,
  summary: ImportTaskTableSummarySchema,
});
export type ImportTaskTablePlan = z.infer<typeof ImportTaskTablePlanSchema>;

// One entry of the Task Table ingestion history (EOCP-E9-03).
export const TaskTableImportHistorySchema = z.object({
  planId: IdSchema,
  adapter: z.string(),
  sourceName: z.string().nullable(),
  acceptedCount: z.number().int(),
  rejectedCount: z.number().int(),
  createdAt: z.coerce.date(),
  committedAt: z.coerce.date().nullable(),
  committedScriptId: IdSchema.nullable(),
  committedVersionId: IdSchema.nullable(),
});
export type TaskTableImportHistory = z.infer<
  typeof TaskTableImportHistorySchema
>;

// Detail view adds the source document and the parsed IR, so a conversion can
// be reconstructed and replayed.
export const TaskTableImportDetailSchema = TaskTableImportHistorySchema.extend({
  sourceContent: z.string().nullable(),
  ir: z.unknown(),
});
export type TaskTableImportDetail = z.infer<
  typeof TaskTableImportDetailSchema
>;

export const CommitTaskTableResultSchema = z.object({
  scriptId: IdSchema,
  versionId: IdSchema,
  chainId: IdSchema,
});
export type CommitTaskTableResult = z.infer<typeof CommitTaskTableResultSchema>;
