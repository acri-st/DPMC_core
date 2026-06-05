import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessingChainTemplateSchema } from '../schemas';

export const ListProcessingChainTemplateResponse200Schema =
  ApiResponseSchema.extend({
    data: ProcessingChainTemplateSchema.array(),
  });

export type ListProcessingChainTemplateResponse200 = z.infer<
  typeof ListProcessingChainTemplateResponse200Schema
>;

export const ListProcessingChainTemplateRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSING_CHAIN_TEMPLATE.LIST,
  responses: {
    200: ListProcessingChainTemplateResponse200Schema,
    500: Error500Schema,
  },
};
