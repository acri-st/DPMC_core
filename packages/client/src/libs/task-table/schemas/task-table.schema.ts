import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ImportTaskTableBodySchema = z.object({
  adapter: z.string().min(1),
  content: z.string().min(1),
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

export const CommitTaskTableResultSchema = z.object({
  scriptId: IdSchema,
  versionId: IdSchema,
  chainId: IdSchema,
});
export type CommitTaskTableResult = z.infer<typeof CommitTaskTableResultSchema>;
