import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error403Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema, UpdateBatchPriorityBodySchema } from '../schemas';

export const UpdateBatchPriorityResponse200Schema = ApiResponseSchema.extend({
  data: BatchSchema,
});

export type UpdateBatchPriorityResponse200 = z.infer<
  typeof UpdateBatchPriorityResponse200Schema
>;

export const UpdateBatchPriorityRoute = {
  method: METHODS.PATCH,
  path: PATHS.BATCH.UPDATE_PRIORITY,
  body: UpdateBatchPriorityBodySchema,
  responses: {
    200: UpdateBatchPriorityResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
