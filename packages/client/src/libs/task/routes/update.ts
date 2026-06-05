import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema, UpdateTaskBodySchema } from '../schemas';

export const UpdateTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});

export type UpdateTaskResponse200 = z.infer<typeof UpdateTaskResponse200Schema>;

export const UpdateTaskRoute = {
  method: METHODS.PATCH,
  path: PATHS.TASK.UPDATE,
  body: UpdateTaskBodySchema,
  responses: {
    200: UpdateTaskResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
