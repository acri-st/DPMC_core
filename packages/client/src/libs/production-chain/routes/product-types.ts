import { z } from 'zod';
import {
  ApiResponseSchema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProductionChainSchema } from '../schemas';

// POST /production-chain/:id/product-types/:productTypeId
export const LinkProductTypeResponse200Schema = ApiResponseSchema.extend({
  data: ProductionChainSchema,
});
export type LinkProductTypeResponse200 = z.infer<
  typeof LinkProductTypeResponse200Schema
>;
export const LinkProductTypeRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.LINK_PRODUCT_TYPE,
  body: z.object({}).optional(),
  responses: {
    200: LinkProductTypeResponse200Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// DELETE /production-chain/:id/product-types/:productTypeId
export const UnlinkProductTypeResponse204Schema = ApiResponseSchema;
export type UnlinkProductTypeResponse204 = z.infer<
  typeof UnlinkProductTypeResponse204Schema
>;
export const UnlinkProductTypeRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_CHAIN.UNLINK_PRODUCT_TYPE,
  responses: {
    204: UnlinkProductTypeResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
