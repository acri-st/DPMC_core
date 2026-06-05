import { z } from 'zod';
import {
  ProductSchema,
  ProductionChainSchema,
  ProcessorVersionSchema,
  type Product,
  type ProductionChain,
  type ProcessorVersion,
} from '@dpmc/client';

import { apiFetch } from '@/shared/libs/api-client';

const ProductionChainListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductionChainSchema.array(),
});

const ProcessorVersionListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessorVersionSchema.array(),
});

const CompatibleProductsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductSchema.array(),
});

export async function listProductionChainsLookup(): Promise<ProductionChain[]> {
  const raw = await apiFetch<unknown>('/production-chain?page=1&pageSize=500');
  const parsed = ProductionChainListResponseSchema.parse(raw);
  return parsed.data;
}

export async function listProcessorVersionsLookup(): Promise<
  ProcessorVersion[]
> {
  const raw = await apiFetch<unknown>('/processor-version?page=1&pageSize=500');
  const parsed = ProcessorVersionListResponseSchema.parse(raw);
  return parsed.data;
}

/**
 * Products the picked production chain accepts as input. Backed by
 * `production_chain_x_product_type`; falls back to project-wide Products
 * when the chain has no productType declared (see API service).
 */
export async function listCompatibleProductsLookup(
  productionChainId: string,
): Promise<Product[]> {
  const raw = await apiFetch<unknown>(
    `/production-chain/${productionChainId}/compatible-products`,
  );
  const parsed = CompatibleProductsResponseSchema.parse(raw);
  return parsed.data;
}
