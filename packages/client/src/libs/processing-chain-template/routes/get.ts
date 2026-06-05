import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessingChainTemplateSchema } from '../schemas';

export const GetProcessingChainTemplateResponse200Schema =
  ApiResponseSchema.extend({
    data: ProcessingChainTemplateSchema,
  });

export type GetProcessingChainTemplateResponse200 = z.infer<
  typeof GetProcessingChainTemplateResponse200Schema
>;

export const GetProcessingChainTemplateRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSING_CHAIN_TEMPLATE.GET,
  responses: {
    200: GetProcessingChainTemplateResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
