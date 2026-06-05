import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProcessingChainTemplateResponse204Schema = ApiResponseSchema;

export type DeleteProcessingChainTemplateResponse204 = z.infer<
  typeof DeleteProcessingChainTemplateResponse204Schema
>;

export const DeleteProcessingChainTemplateRoute = {
  method: METHODS.DELETE,
  path: PATHS.PROCESSING_CHAIN_TEMPLATE.DELETE,
  responses: {
    204: DeleteProcessingChainTemplateResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
