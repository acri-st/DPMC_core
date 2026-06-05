import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error403Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  AddProductionChainNodeBodySchema,
  ProductionChainNodeSchema,
  UpdateProductionChainNodeBodySchema,
} from '../schemas';

// POST /production-chain/:id/versions/:versionId/nodes
export const AddProductionChainNodeResponse201Schema = ApiResponseSchema.extend(
  {
    data: ProductionChainNodeSchema,
  },
);
export type AddProductionChainNodeResponse201 = z.infer<
  typeof AddProductionChainNodeResponse201Schema
>;

export const AddProductionChainNodeRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.ADD_NODE,
  body: AddProductionChainNodeBodySchema,
  responses: {
    201: AddProductionChainNodeResponse201Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// PATCH /production-chain/:id/versions/:versionId/nodes/:nodeId
export const UpdateProductionChainNodeResponse200Schema =
  ApiResponseSchema.extend({
    data: ProductionChainNodeSchema,
  });
export type UpdateProductionChainNodeResponse200 = z.infer<
  typeof UpdateProductionChainNodeResponse200Schema
>;

export const UpdateProductionChainNodeRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCTION_CHAIN.UPDATE_NODE,
  body: UpdateProductionChainNodeBodySchema,
  responses: {
    200: UpdateProductionChainNodeResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// DELETE /production-chain/:id/versions/:versionId/nodes/:nodeId
export const DeleteProductionChainNodeResponse204Schema =
  ApiResponseSchema.extend({
    data: z.null(),
  });
export type DeleteProductionChainNodeResponse204 = z.infer<
  typeof DeleteProductionChainNodeResponse204Schema
>;

export const DeleteProductionChainNodeRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_CHAIN.DELETE_NODE,
  responses: {
    204: DeleteProductionChainNodeResponse204Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
