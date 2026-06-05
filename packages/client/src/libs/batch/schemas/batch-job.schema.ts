import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { JobStatusSchema } from '../../job/schemas/job.schema';

/**
 * Job view scoped to a single Batch — what the BatchDetailPage needs to
 * surface execution status, host, error message, and timing per job.
 * `acronym` carries the processing script's short code (PC1, PC2, ...) so
 * the UI can label rows without a separate join.
 */
export const BatchJobSchema = z.object({
  id: IdSchema,
  status: JobStatusSchema,
  hostId: IdSchema.nullable(),
  hostname: z.string().nullable().optional(),
  acronym: z.string(),
  scriptName: z.string(),
  lastError: z.string().nullable(),
  exitCode: z.number().int().nullable().optional(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  attempt: z.number().int(),
});
export type BatchJob = z.infer<typeof BatchJobSchema>;
