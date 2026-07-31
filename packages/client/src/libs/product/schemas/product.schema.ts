import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ProductSchema = z.object({
  id: IdSchema,
  productTypeId: IdSchema,
  parentBatchId: IdSchema.nullable(),
  name: z.string(),
  version: z.string(),
  isDefault: z.boolean(),
  generatedAt: z.coerce.date().nullable(),
  parameters: z.unknown().nullable(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductBodySchema = z.object({
  productTypeId: IdSchema,
  parentBatchId: IdSchema.nullable().optional(),
  name: z.string().min(1).max(255),
  version: z.string().max(120).optional(),
  isDefault: z.boolean().optional(),
  generatedAt: z.coerce.date().nullable().optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export type CreateProductBody = z.infer<typeof CreateProductBodySchema>;

export const UpdateProductBodySchema = z.object({
  productTypeId: IdSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  version: z.string().max(120).optional(),
  isDefault: z.boolean().optional(),
  generatedAt: z.coerce.date().nullable().optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export type UpdateProductBody = z.infer<typeof UpdateProductBodySchema>;
