import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductSchema } from '../../product/schemas/product.schema';

/**
 * Products of types declared compatible with a given production chain
 * (`production_chain_x_product_type`). Used by the LaunchTaskDialog's
 * Product picker so the operator only sees inputs the chain accepts.
 * If the chain has no productTypes attached, the API falls back to the
 * project's full Product list — the picker stays usable for chains
 * without declared metadata.
 */
export const ListCompatibleProductsResponse200Schema = ApiResponseSchema.extend(
  {
    data: z.array(ProductSchema),
  },
);
export type ListCompatibleProductsResponse200 = z.infer<
  typeof ListCompatibleProductsResponse200Schema
>;

export const ListCompatibleProductsRoute = {
  method: METHODS.GET,
  path: PATHS.PRODUCTION_CHAIN.LIST_COMPATIBLE_PRODUCTS,
  responses: {
    200: ListCompatibleProductsResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
