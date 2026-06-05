import { z } from 'zod';
import { IdSchema, ProductionModeSchema } from '../../_shared';

export const ProjectSchema = z.object({
  id: IdSchema,
  identifier: z.string(),
  name: z.string(),
  comment: z.string().nullable(),
  isActive: z.boolean(),
  allowedProductionModes: ProductionModeSchema.array(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectBodySchema = z.object({
  identifier: z.string().min(1).max(120),
  name: z.string().min(1).max(255),
  comment: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  allowedProductionModes: ProductionModeSchema.array().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

export const UpdateProjectBodySchema = z.object({
  identifier: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(255).optional(),
  comment: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  allowedProductionModes: ProductionModeSchema.array().optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;
