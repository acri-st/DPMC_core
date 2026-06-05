import { z } from 'zod';
import { IdSchema, ProductionModeSchema } from '../../_shared';

export const ProductIngestionHookSchema = z.object({
  id: IdSchema,
  productTypeId: IdSchema,
  productionChainId: IdSchema.nullable(),
  projectId: IdSchema,
  productionMode: ProductionModeSchema,
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
});
export type ProductIngestionHook = z.infer<typeof ProductIngestionHookSchema>;

export const CreateProductIngestionHookBodySchema = z.object({
  productTypeId: IdSchema,
  productionChainId: IdSchema.nullable().optional(),
  projectId: IdSchema,
  productionMode: ProductionModeSchema.optional(),
  enabled: z.boolean().optional(),
});
export type CreateProductIngestionHookBody = z.infer<
  typeof CreateProductIngestionHookBodySchema
>;

export const UpdateProductIngestionHookBodySchema = z.object({
  enabled: z.boolean().optional(),
  productionChainId: IdSchema.nullable().optional(),
  productionMode: ProductionModeSchema.optional(),
});
export type UpdateProductIngestionHookBody = z.infer<
  typeof UpdateProductIngestionHookBodySchema
>;
