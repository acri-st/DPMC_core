import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ProcessingChainTemplateSchema = z.object({
  id: IdSchema,
  name: z.string(),
  acronym: z.string(),
  processingScriptId: IdSchema,
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
});
export type ProcessingChainTemplate = z.infer<
  typeof ProcessingChainTemplateSchema
>;

export const CreateProcessingChainTemplateBodySchema = z.object({
  name: z.string().min(1).max(255),
  acronym: z.string().min(1).max(120),
  processingScriptId: IdSchema,
  comment: z.string().max(2000).nullable().optional(),
});
export type CreateProcessingChainTemplateBody = z.infer<
  typeof CreateProcessingChainTemplateBodySchema
>;

export const UpdateProcessingChainTemplateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  comment: z.string().max(2000).nullable().optional(),
});
export type UpdateProcessingChainTemplateBody = z.infer<
  typeof UpdateProcessingChainTemplateBodySchema
>;
