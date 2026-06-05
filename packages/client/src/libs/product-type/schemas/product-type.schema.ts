import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ProductTypeSchema = z.object({
  id: IdSchema,
  acronym: z.string(),
  name: z.string(),
  processingLevel: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductType = z.infer<typeof ProductTypeSchema>;

export const CreateProductTypeBodySchema = z.object({
  acronym: z.string().min(1).max(60),
  name: z.string().min(1).max(255),
  processingLevel: z.string().max(60).nullable().optional(),
});

export type CreateProductTypeBody = z.infer<typeof CreateProductTypeBodySchema>;

export const UpdateProductTypeBodySchema = z.object({
  acronym: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(255).optional(),
  processingLevel: z.string().max(60).nullable().optional(),
});

export type UpdateProductTypeBody = z.infer<typeof UpdateProductTypeBodySchema>;
