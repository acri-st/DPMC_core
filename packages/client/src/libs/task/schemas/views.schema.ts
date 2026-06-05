import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { TaskSchema } from './task.schema';

const JobMiniSchema = z.object({
  id: IdSchema,
  status: z.string(),
  hostId: IdSchema.nullable(),
});

const BatchInTreeSchema = z.object({
  id: IdSchema,
  status: z.string(),
  jobs: JobMiniSchema.array(),
});

export const ExecutionTreeSchema = z.object({
  task: TaskSchema,
  productionChain: z.object({
    id: IdSchema.nullable(),
    name: z.string().nullable(),
    version: z.string().nullable(),
  }),
  batches: BatchInTreeSchema.array(),
});
export type ExecutionTree = z.infer<typeof ExecutionTreeSchema>;

export const TaskHistoryEntrySchema = z.object({
  batchId: IdSchema,
  jobId: IdSchema,
  status: z.string(),
  hostId: IdSchema.nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
});
export type TaskHistoryEntry = z.infer<typeof TaskHistoryEntrySchema>;

export const TaskStatusSummarySchema = z.object({
  Edited: z.number().int(),
  Queued: z.number().int(),
  Running: z.number().int(),
  Done: z.number().int(),
  Error: z.number().int(),
  Suspended: z.number().int(),
});
export type TaskStatusSummary = z.infer<typeof TaskStatusSummarySchema>;
