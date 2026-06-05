import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const DatasetProductSchema = z.object({
  datasetId: IdSchema,
  productId: IdSchema,
  role: z.string(),
  sequence: z.number().int().nonnegative(),
});

export const DatasetSchema = z.object({
  id: IdSchema,
  name: z.string().nullable(),
  producedByBatchId: IdSchema.nullable(),
  createdAt: z.string().datetime(),
  products: DatasetProductSchema.array().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetProduct = z.infer<typeof DatasetProductSchema>;

export const CreateDatasetBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  products: z
    .object({
      productId: IdSchema,
      role: z.string().min(1).max(64),
      sequence: z.number().int().nonnegative().optional(),
    })
    .array()
    .min(1),
});
export type CreateDatasetBody = z.infer<typeof CreateDatasetBodySchema>;

export const UpdateDatasetBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  products: z
    .object({
      productId: IdSchema,
      role: z.string().min(1).max(64),
      sequence: z.number().int().nonnegative().optional(),
    })
    .array()
    .optional(),
});
export type UpdateDatasetBody = z.infer<typeof UpdateDatasetBodySchema>;
