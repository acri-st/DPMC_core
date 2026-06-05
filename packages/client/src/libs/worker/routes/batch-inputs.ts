import { z } from 'zod';
import {
  ApiResponseSchema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchInputsSchema } from '../schemas';

export const BatchInputsResponse200Schema = ApiResponseSchema.extend({
  data: BatchInputsSchema,
});
export type BatchInputsResponse200 = z.infer<
  typeof BatchInputsResponse200Schema
>;

export const BatchInputsRoute = {
  method: METHODS.GET,
  path: PATHS.WORKER.BATCH_INPUTS,
  responses: {
    200: BatchInputsResponse200Schema,
    401: Error401Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
