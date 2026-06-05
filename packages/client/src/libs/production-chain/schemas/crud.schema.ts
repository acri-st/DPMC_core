import { z } from 'zod';
import { IdSchema, ProductionChainKindSchema } from '../../_shared';
import { DependencyModeSchema } from './production-chain.schema';

export const CreateProductionChainRequestSchema = z.object({
  name: z.string().min(1).max(120),
  comment: z.string().max(2000).nullable().optional(),
  configuration: z.unknown().nullable().optional(),
  kind: ProductionChainKindSchema.optional(),
  watcherConfig: z.unknown().nullable().optional(),
});

export const UpdateProductionChainRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  comment: z.string().max(2000).nullable().optional(),
  configuration: z.unknown().nullable().optional(),
  kind: ProductionChainKindSchema.optional(),
  watcherConfig: z.unknown().nullable().optional(),
});

export const AddEdgeRequestSchema = z.object({
  parentChainId: IdSchema,
  childChainId: IdSchema,
  dependencyMode: DependencyModeSchema.default('OnSuccess'),
});

export const UpdateEdgeRequestSchema = z.object({
  dependencyMode: DependencyModeSchema,
});

export type CreateProductionChainRequest = z.infer<
  typeof CreateProductionChainRequestSchema
>;
export type UpdateProductionChainRequest = z.infer<
  typeof UpdateProductionChainRequestSchema
>;
export type AddEdgeRequest = z.infer<typeof AddEdgeRequestSchema>;
export type UpdateEdgeRequest = z.infer<typeof UpdateEdgeRequestSchema>;
