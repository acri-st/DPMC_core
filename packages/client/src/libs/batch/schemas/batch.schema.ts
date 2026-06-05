import { z } from 'zod';
import {
  IdSchema,
  PriorityClassSchema,
  ProductionModeSchema,
} from '../../_shared';

export const BatchStatusSchema = z.enum([
  'Pending',
  'Running',
  'Success',
  'Failed',
  'Cancelled',
]);

export const BatchKindSchema = z.enum(['Chain', 'Standalone']);

export const BatchSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  taskId: IdSchema,
  productionChainId: IdSchema.nullable(),
  processorVersionId: IdSchema.nullable(),
  parentBatchId: IdSchema.nullable(),
  poolId: IdSchema.nullable(),
  executionTag: z.string(),
  kind: BatchKindSchema,
  status: BatchStatusSchema,
  priority: z.number().int(),
  productionMode: ProductionModeSchema,
  priorityClass: PriorityClassSchema,
  constraints: z.unknown().nullable(),
  configuration: z.unknown().nullable(),
  parameters: z.unknown().nullable(),
  parametersIn: z.unknown().nullable(),
  parametersOut: z.unknown().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  fanOutGroupId: z.string().uuid().nullish(),
  processingChainId: IdSchema.nullish(),
  // Computed (carbon-aware): not stored, derived from jobs. Optional in API.
  co2Grams: z.number().nullable().optional(),
  totalDurationMs: z.number().nullable().optional(),
});

export type BatchStatus = z.infer<typeof BatchStatusSchema>;
export type BatchKind = z.infer<typeof BatchKindSchema>;
export type Batch = z.infer<typeof BatchSchema>;
