import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const AuxiliaryConfigurationSchema = z.object({
  id: IdSchema,
  name: z.string(),
  baseline: z.string().nullable(),
  comment: z.string().nullable(),
  parameters: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type AuxiliaryConfiguration = z.infer<
  typeof AuxiliaryConfigurationSchema
>;

export const CreateAuxiliaryConfigurationBodySchema = z.object({
  name: z.string().min(1).max(255),
  baseline: z.string().max(120).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  parameters: z.unknown().nullable().optional(),
});

export type CreateAuxiliaryConfigurationBody = z.infer<
  typeof CreateAuxiliaryConfigurationBodySchema
>;

export const UpdateAuxiliaryConfigurationBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  baseline: z.string().max(120).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  parameters: z.unknown().nullable().optional(),
});

export type UpdateAuxiliaryConfigurationBody = z.infer<
  typeof UpdateAuxiliaryConfigurationBodySchema
>;
