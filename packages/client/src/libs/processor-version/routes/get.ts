import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessorVersionSchema } from '../schemas';

export const GetProcessorVersionResponse200Schema = ApiResponseSchema.extend({
  data: ProcessorVersionSchema,
});

export type GetProcessorVersionResponse200 = z.infer<
  typeof GetProcessorVersionResponse200Schema
>;

export const GetProcessorVersionRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSOR_VERSION.GET,
  responses: {
    200: GetProcessorVersionResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
