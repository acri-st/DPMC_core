import { z } from 'zod';
import {
  IdSchema,
  PriorityClassSchema,
  ProductionModeSchema,
} from '../../_shared';

const BaseFieldsSchema = z.object({
  projectId: IdSchema.optional(),
  productionMode: ProductionModeSchema,
  priority: z.number().int().nonnegative().default(0),
  priorityClass: PriorityClassSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  input: z.unknown().optional(),
  constraints: z.unknown().optional(),
  configuration: z.unknown().optional(),
  poolId: IdSchema.nullable().optional(),
});

export const CreateChainBatchSchema = BaseFieldsSchema.extend({
  kind: z.literal('Chain'),
  productionChainId: IdSchema.optional(),
});

export const CreateStandaloneBatchSchema = BaseFieldsSchema.extend({
  kind: z.literal('Standalone'),
  processorVersionId: IdSchema.optional(),
  processingScriptVersionId: IdSchema.optional(),
  processingScriptId: IdSchema.optional(),
});

// Note: cross-field rules ("exactly one of ...") are enforced in the service
// layer (not here) so this schema stays a plain ZodObject usable in
// z.discriminatedUnion.
export const CreateBatchRequestSchema = z.discriminatedUnion('kind', [
  CreateChainBatchSchema,
  CreateStandaloneBatchSchema,
]);

export type CreateChainBatch = z.infer<typeof CreateChainBatchSchema>;
export type CreateStandaloneBatch = z.infer<typeof CreateStandaloneBatchSchema>;
export type CreateBatchRequest = z.infer<typeof CreateBatchRequestSchema>;

export const UpdateBatchPriorityBodySchema = z.object({
  priority: z.number().int(),
  class: PriorityClassSchema,
});
export type UpdateBatchPriorityBody = z.infer<
  typeof UpdateBatchPriorityBodySchema
>;
