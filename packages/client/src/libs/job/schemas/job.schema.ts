import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const JobStatusSchema = z.enum([
  'Waiting',
  'Ready',
  'Running',
  'Success',
  'Failed',
  'Skipped',
  'Cancelled',
]);

export const JobSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  batchId: IdSchema,
  processingScriptVersionId: IdSchema,
  hostId: IdSchema.nullable(),
  executionTag: z.string(),
  status: JobStatusSchema,
  paused: z.boolean(),
  pid: z.number().int().nullable(),
  parameters: z.unknown().nullable(),
  outputDir: z.string().nullable(),
  avgPower: z.number().nullable(),
  dataVolume: z.bigint().nullable(),
  expectedStartTime: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type Job = z.infer<typeof JobSchema>;
