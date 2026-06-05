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
  CreateProcessorVersionBodySchema,
  ProcessorVersionSchema,
} from '../schemas';

export const CreateProcessorVersionResponse201Schema = ApiResponseSchema.extend(
  {
    data: ProcessorVersionSchema,
  },
);

export type CreateProcessorVersionResponse201 = z.infer<
  typeof CreateProcessorVersionResponse201Schema
>;

export const CreateProcessorVersionRoute = {
  method: METHODS.POST,
  path: PATHS.PROCESSOR_VERSION.CREATE,
  body: CreateProcessorVersionBodySchema,
  responses: {
    201: CreateProcessorVersionResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
