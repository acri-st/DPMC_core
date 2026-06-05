import { z } from 'zod';
import { IdSchema, ProductionChainKindSchema } from '../../_shared';

export const DependencyModeSchema = z.enum([
  'OnSuccess',
  'OnFailure',
  'OnCompletion',
  'OnDataAvailable',
  'Optional',
]);
export type DependencyMode = z.infer<typeof DependencyModeSchema>;

export const ProductionChainSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  name: z.string(),
  comment: z.string().nullable(),
  isActive: z.boolean(),
  kind: ProductionChainKindSchema.default('Standard'),
  watcherConfig: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductionChain = z.infer<typeof ProductionChainSchema>;

export const ProductionChainScriptVersionSchema = z.object({
  id: IdSchema,
  version: z.string(),
  runtime: z.enum(['Docker', 'Apptainer', 'None']),
  imageUrl: z.string().nullable(),
  imageTag: z.string().nullable(),
  imageChecksum: z.string().nullable(),
  requiredCpu: z.number(),
  requiredRam: z.union([z.number(), z.bigint(), z.string()]),
  requiredDisk: z.union([z.number(), z.bigint(), z.string()]),
  requiresGpu: z.boolean(),
  gpuCount: z.number().int(),
});

export type ProductionChainScriptVersion = z.infer<
  typeof ProductionChainScriptVersionSchema
>;

export const ProductionChainScriptSchema = z.object({
  id: IdSchema,
  name: z.string(),
  acronym: z.string(),
  defaultVersion: ProductionChainScriptVersionSchema.nullable(),
});

export type ProductionChainScript = z.infer<typeof ProductionChainScriptSchema>;

export const ProcessingChainNodeSchema = z.object({
  id: IdSchema,
  name: z.string(),
  comment: z.string().nullable(),
  processingScriptId: IdSchema,
  configuration: z.unknown().nullable(),
});
export type ProcessingChainNode = z.infer<typeof ProcessingChainNodeSchema>;

export const ProductionChainEdgeSchema = z.object({
  id: IdSchema,
  productionChainId: IdSchema,
  parentChainId: IdSchema,
  childChainId: IdSchema,
  dependencyMode: DependencyModeSchema,
  isFanOut: z.boolean().default(false),
});

export type ProductionChainEdge = z.infer<typeof ProductionChainEdgeSchema>;

export const ProductionChainVersionSchema = z.object({
  id: IdSchema,
  version: z.string(),
  isLatest: z.boolean(),
  configuration: z.unknown().nullable(),
  processingChains: ProcessingChainNodeSchema.array(),
  edges: ProductionChainEdgeSchema.array(),
});
export type ProductionChainVersion = z.infer<
  typeof ProductionChainVersionSchema
>;

export const ProductionChainGraphSchema = ProductionChainSchema.extend({
  configuration: z.unknown().nullable(),
  processingChains: ProcessingChainNodeSchema.array(),
  edges: ProductionChainEdgeSchema.array(),
});

export type ProductionChainGraph = z.infer<typeof ProductionChainGraphSchema>;
