import { z } from 'zod';
import { IdSchema } from '../../_shared';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';

// Old-ACS (CryoSat-style, root <Task_Table>) multi-file import: several task
// tables become ONE production chain — one node per table, pools as
// sequenced executables, edges inferred from DB output/input type matches.
// Additive next to the single-file Sentinel-style `ipf` import.

const AcsFileSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(2_000_000),
});

export const ImportAcsProductionChainBodySchema = z.object({
  files: z.array(AcsFileSchema).min(1).max(32),
  options: z
    .object({
      /** Container-side root replacing everything before `/Binaries/` in
       * delivery paths (e.g. /dpmc/scripts/cryosat_ocean_baseline_d). */
      installRoot: z.string().min(1).max(500).optional(),
      chainName: z.string().min(1).max(200).optional(),
      /** Per-processor image override: acronym → image reference. */
      images: z
        .record(
          z.string(),
          z.object({
            imageUrl: z.string().min(1).max(500),
            imageTag: z.string().min(1).max(100).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});
export type ImportAcsProductionChainBody = z.infer<
  typeof ImportAcsProductionChainBodySchema
>;

const AcsChainNodePlanSchema = z.object({
  acronym: z.string(),
  sourceName: z.string(),
  version: z.string(),
  taskCount: z.number().int().nonnegative(),
  executables: z.array(
    z.object({ name: z.string(), path: z.string(), sequence: z.number() }),
  ),
  dbOutputTypes: z.array(z.string()),
  externalInputTypes: z.array(z.string()),
  suggestedImageUrl: z.string().nullable(),
});

const AcsChainEdgePlanSchema = z.object({
  parentAcronym: z.string(),
  childAcronym: z.string(),
  dependencyMode: z.enum(['OnSuccess', 'OnCompletion']),
  viaTypes: z.array(z.string()),
});

export const AcsChainPlanSchema = z.object({
  name: z.string(),
  nodes: z.array(AcsChainNodePlanSchema),
  edges: z.array(AcsChainEdgePlanSchema),
  detectedSourceRoot: z.string().nullable(),
  warnings: z.array(z.string()),
});
export type AcsChainPlanDto = z.infer<typeof AcsChainPlanSchema>;

export const PreviewAcsProductionChainResponse200Schema =
  ApiResponseSchema.extend({ data: AcsChainPlanSchema });
export type PreviewAcsProductionChainResponse200 = z.infer<
  typeof PreviewAcsProductionChainResponse200Schema
>;

export const ImportAcsProductionChainResponse201Schema =
  ApiResponseSchema.extend({
    data: z.object({
      chainId: IdSchema,
      nodeCount: z.number().int().nonnegative(),
      edgeCount: z.number().int().nonnegative(),
    }),
  });
export type ImportAcsProductionChainResponse201 = z.infer<
  typeof ImportAcsProductionChainResponse201Schema
>;

export const PreviewAcsProductionChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.IMPORT_ACS_PREVIEW,
  body: ImportAcsProductionChainBodySchema,
  responses: {
    200: PreviewAcsProductionChainResponse200Schema,
    400: Error400Schema,
    500: Error500Schema,
  },
};

export const ImportAcsProductionChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.IMPORT_ACS,
  body: ImportAcsProductionChainBodySchema,
  responses: {
    201: ImportAcsProductionChainResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
