import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const ProductionChainNodeSchema = z.object({
  id: IdSchema,
  productionChainVersionId: IdSchema,
  processingChainTemplateId: IdSchema,
  alias: z.string(),
  configurationOverride: z.unknown().nullable(),
  inputProductSelector: z.unknown().nullable(),
});
export type ProductionChainNode = z.infer<typeof ProductionChainNodeSchema>;

export const AddProductionChainNodeBodySchema = z.object({
  processingChainTemplateId: IdSchema,
  alias: z.string().min(1).max(120),
  configurationOverride: z.unknown().nullable().optional(),
  inputProductSelector: z.unknown().nullable().optional(),
});
export type AddProductionChainNodeBody = z.infer<
  typeof AddProductionChainNodeBodySchema
>;

export const UpdateProductionChainNodeBodySchema = z.object({
  alias: z.string().min(1).max(120).optional(),
  configurationOverride: z.unknown().nullable().optional(),
  inputProductSelector: z.unknown().nullable().optional(),
});
export type UpdateProductionChainNodeBody = z.infer<
  typeof UpdateProductionChainNodeBodySchema
>;
