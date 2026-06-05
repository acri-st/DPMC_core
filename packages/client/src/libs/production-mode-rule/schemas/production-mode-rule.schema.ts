import { z } from 'zod';
import { IdSchema, ProductionModeSchema } from '../../_shared';

export const ProductionModeRuleSchema = z.object({
  id: IdSchema,
  mode: ProductionModeSchema,
  projectId: IdSchema.nullable(),
  productionChainId: IdSchema.nullable(),
  priorityWeight: z.number(),
  processorVersionPin: z.string().nullable(),
  datasetFilter: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ProductionModeRule = z.infer<typeof ProductionModeRuleSchema>;

export const CreateProductionModeRuleBodySchema = z.object({
  mode: ProductionModeSchema,
  projectId: IdSchema.nullable().optional(),
  productionChainId: IdSchema.nullable().optional(),
  priorityWeight: z.number().optional(),
  processorVersionPin: z.string().nullable().optional(),
  datasetFilter: z.unknown().nullable().optional(),
});
export type CreateProductionModeRuleBody = z.infer<
  typeof CreateProductionModeRuleBodySchema
>;

export const UpdateProductionModeRuleBodySchema = z.object({
  priorityWeight: z.number().optional(),
  processorVersionPin: z.string().nullable().optional(),
  datasetFilter: z.unknown().nullable().optional(),
});
export type UpdateProductionModeRuleBody = z.infer<
  typeof UpdateProductionModeRuleBodySchema
>;
