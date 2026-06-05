import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  AddEdgeRequestSchema,
  ProductionChainEdgeSchema,
  UpdateEdgeRequestSchema,
} from '../schemas';

// POST /production-chain/:id/edges
export const AddEdgeResponse201Schema = ApiResponseSchema.extend({
  data: ProductionChainEdgeSchema,
});
export type AddEdgeResponse201 = z.infer<typeof AddEdgeResponse201Schema>;

export const AddEdgeRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.ADD_EDGE,
  body: AddEdgeRequestSchema,
  responses: {
    201: AddEdgeResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// PATCH /production-chain/:id/edges/:edgeId
export const UpdateEdgeResponse200Schema = ApiResponseSchema.extend({
  data: ProductionChainEdgeSchema,
});
export type UpdateEdgeResponse200 = z.infer<typeof UpdateEdgeResponse200Schema>;

export const UpdateEdgeRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCTION_CHAIN.UPDATE_EDGE,
  body: UpdateEdgeRequestSchema,
  responses: {
    200: UpdateEdgeResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};

// DELETE /production-chain/:id/edges/:edgeId
export const DeleteEdgeResponse204Schema = ApiResponseSchema;
export type DeleteEdgeResponse204 = z.infer<typeof DeleteEdgeResponse204Schema>;

export const DeleteEdgeRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_CHAIN.DELETE_EDGE,
  responses: {
    204: DeleteEdgeResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
