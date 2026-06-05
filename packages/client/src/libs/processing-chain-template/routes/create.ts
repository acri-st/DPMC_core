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
  CreateProcessingChainTemplateBodySchema,
  ProcessingChainTemplateSchema,
} from '../schemas';

export const CreateProcessingChainTemplateResponse201Schema =
  ApiResponseSchema.extend({
    data: ProcessingChainTemplateSchema,
  });

export type CreateProcessingChainTemplateResponse201 = z.infer<
  typeof CreateProcessingChainTemplateResponse201Schema
>;

export const CreateProcessingChainTemplateRoute = {
  method: METHODS.POST,
  path: PATHS.PROCESSING_CHAIN_TEMPLATE.CREATE,
  body: CreateProcessingChainTemplateBodySchema,
  responses: {
    201: CreateProcessingChainTemplateResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
