import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProcessorVersionResponse204Schema = ApiResponseSchema;

export type DeleteProcessorVersionResponse204 = z.infer<
  typeof DeleteProcessorVersionResponse204Schema
>;

export const DeleteProcessorVersionRoute = {
  method: METHODS.DELETE,
  path: PATHS.PROCESSOR_VERSION.DELETE,
  responses: {
    204: DeleteProcessorVersionResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
