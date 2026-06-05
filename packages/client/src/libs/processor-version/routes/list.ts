import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProcessorVersionSchema } from '../schemas';

export const ListProcessorVersionResponse200Schema = ApiResponseSchema.extend({
  data: ProcessorVersionSchema.array(),
});

export type ListProcessorVersionResponse200 = z.infer<
  typeof ListProcessorVersionResponse200Schema
>;

export const ListProcessorVersionRoute = {
  method: METHODS.GET,
  path: PATHS.PROCESSOR_VERSION.LIST,
  responses: {
    200: ListProcessorVersionResponse200Schema,
    500: Error500Schema,
  },
};
