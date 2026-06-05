import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ProcessorVersionSchema = z.object({
  id: IdSchema,
  processingScriptVersionId: IdSchema,
  auxiliaryConfigurationId: IdSchema,
  baseline: z.string(),
  comment: z.string().nullable(),
  parameters: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
});

export type ProcessorVersion = z.infer<typeof ProcessorVersionSchema>;

export const CreateProcessorVersionBodySchema = z.object({
  processingScriptVersionId: IdSchema,
  auxiliaryConfigurationId: IdSchema,
  baseline: z.string().min(1).max(120),
  comment: z.string().max(2000).nullable().optional(),
  parameters: z.unknown().nullable().optional(),
});

export type CreateProcessorVersionBody = z.infer<
  typeof CreateProcessorVersionBodySchema
>;

export const UpdateProcessorVersionBodySchema = z.object({
  baseline: z.string().min(1).max(120).optional(),
  comment: z.string().max(2000).nullable().optional(),
  parameters: z.unknown().nullable().optional(),
});

export type UpdateProcessorVersionBody = z.infer<
  typeof UpdateProcessorVersionBodySchema
>;
