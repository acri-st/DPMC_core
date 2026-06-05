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
import { TaskSchema, UpdateTaskPriorityBodySchema } from '../schemas';

export const UpdateTaskPriorityResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});

export type UpdateTaskPriorityResponse200 = z.infer<
  typeof UpdateTaskPriorityResponse200Schema
>;

export const UpdateTaskPriorityRoute = {
  method: METHODS.PATCH,
  path: PATHS.TASK.UPDATE_PRIORITY,
  body: UpdateTaskPriorityBodySchema,
  responses: {
    200: UpdateTaskPriorityResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
