import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  ProcessingChainTemplateSchema,
  UpdateProcessingChainTemplateBodySchema,
} from '../schemas';

export const UpdateProcessingChainTemplateResponse200Schema =
  ApiResponseSchema.extend({
    data: ProcessingChainTemplateSchema,
  });

export type UpdateProcessingChainTemplateResponse200 = z.infer<
  typeof UpdateProcessingChainTemplateResponse200Schema
>;

export const UpdateProcessingChainTemplateRoute = {
  method: METHODS.PATCH,
  path: PATHS.PROCESSING_CHAIN_TEMPLATE.UPDATE,
  body: UpdateProcessingChainTemplateBodySchema,
  responses: {
    200: UpdateProcessingChainTemplateResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
