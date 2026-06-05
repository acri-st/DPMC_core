import { z } from 'zod';
import { IdSchema } from '../../_shared';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const ImportProductionChainBodySchema = z.object({
  adapter: z.literal('ipf'),
  content: z.string().min(1).max(2_000_000),
});
export type ImportProductionChainBody = z.infer<
  typeof ImportProductionChainBodySchema
>;

const ChainNodeIrSchema = z.object({
  acronym: z.string(),
  name: z.string(),
  scriptType: z.string(),
  stage: z.string(),
  path: z.string(),
  runtime: z.string(),
  requiredCpu: z.number(),
  requiredRamBytes: z.string(),
  requiredDiskBytes: z.string(),
  inputTypes: z.array(z.string()),
  outputTypes: z.array(z.string()),
});

const ChainEdgeIrSchema = z.object({
  parentAcronym: z.string(),
  childAcronym: z.string(),
  matchType: z.string(),
});

const ChainParamIrSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number']),
  default: z.union([z.string(), z.number()]).optional(),
});

export const ChainIrSchema = z.object({
  name: z.string(),
  comment: z.string().optional(),
  nodes: z.array(ChainNodeIrSchema),
  edges: z.array(ChainEdgeIrSchema),
  parameters: z.array(ChainParamIrSchema),
});
export type ChainIrDto = z.infer<typeof ChainIrSchema>;

export const ImportProductionChainResponse201Schema = ApiResponseSchema.extend({
  data: z.object({
    chainId: IdSchema,
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
  }),
});
export type ImportProductionChainResponse201 = z.infer<
  typeof ImportProductionChainResponse201Schema
>;

export const ImportProductionChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.IMPORT,
  body: ImportProductionChainBodySchema,
  responses: {
    201: ImportProductionChainResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

export const PreviewProductionChainResponse200Schema = ApiResponseSchema.extend(
  {
    data: ChainIrSchema,
  },
);
export type PreviewProductionChainResponse200 = z.infer<
  typeof PreviewProductionChainResponse200Schema
>;

export const PreviewProductionChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.IMPORT_PREVIEW,
  body: ImportProductionChainBodySchema,
  responses: {
    200: PreviewProductionChainResponse200Schema,
    400: Error400Schema,
    500: Error500Schema,
  },
};
