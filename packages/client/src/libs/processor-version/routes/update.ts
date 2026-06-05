import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import {
  ProcessorVersionSchema,
  UpdateProcessorVersionBodySchema,
} from '../schemas';

export const UpdateProcessorVersionResponse200Schema = ApiResponseSchema.extend(
  {
    data: ProcessorVersionSchema,
  },
);

export type UpdateProcessorVersionResponse200 = z.infer<
  typeof UpdateProcessorVersionResponse200Schema
>;

export const UpdateProcessorVersionRoute = {
  method: METHODS.PATCH,
  path: PATHS.PROCESSOR_VERSION.UPDATE,
  body: UpdateProcessorVersionBodySchema,
  responses: {
    200: UpdateProcessorVersionResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
