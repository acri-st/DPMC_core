import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const AddProcessingChainBodySchema = z.object({
  processingScriptId: IdSchema,
  name: z.string().min(1).max(120),
  comment: z.string().max(2000).nullable().optional(),
  configuration: z.unknown().nullable().optional(),
});

export type AddProcessingChainBody = z.infer<
  typeof AddProcessingChainBodySchema
>;

export const UpdateProcessingChainBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  comment: z.string().max(2000).nullable().optional(),
  configuration: z.unknown().nullable().optional(),
});

export type UpdateProcessingChainBody = z.infer<
  typeof UpdateProcessingChainBodySchema
>;
