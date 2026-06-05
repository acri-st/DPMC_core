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
  AddProcessingChainBodySchema,
  ProcessingChainNodeSchema,
  UpdateProcessingChainBodySchema,
} from '../schemas';

// POST /production-chain/:id/processing-chains
export const AddProcessingChainResponse201Schema = ApiResponseSchema.extend({
  data: ProcessingChainNodeSchema,
});
export type AddProcessingChainResponse201 = z.infer<
  typeof AddProcessingChainResponse201Schema
>;
export const AddProcessingChainRoute = {
  method: METHODS.POST,
  path: PATHS.PRODUCTION_CHAIN.ADD_PROCESSING_CHAIN,
  body: AddProcessingChainBodySchema,
  responses: {
    201: AddProcessingChainResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// PATCH /production-chain/:id/processing-chains/:pcId
export const UpdateProcessingChainResponse200Schema = ApiResponseSchema.extend({
  data: ProcessingChainNodeSchema,
});
export type UpdateProcessingChainResponse200 = z.infer<
  typeof UpdateProcessingChainResponse200Schema
>;
export const UpdateProcessingChainRoute = {
  method: METHODS.PATCH,
  path: PATHS.PRODUCTION_CHAIN.UPDATE_PROCESSING_CHAIN,
  body: UpdateProcessingChainBodySchema,
  responses: {
    200: UpdateProcessingChainResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// DELETE /production-chain/:id/processing-chains/:pcId
export const DeleteProcessingChainResponse204Schema = ApiResponseSchema;
export type DeleteProcessingChainResponse204 = z.infer<
  typeof DeleteProcessingChainResponse204Schema
>;
export const DeleteProcessingChainRoute = {
  method: METHODS.DELETE,
  path: PATHS.PRODUCTION_CHAIN.DELETE_PROCESSING_CHAIN,
  responses: {
    204: DeleteProcessingChainResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
