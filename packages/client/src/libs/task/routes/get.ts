import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema } from '../schemas';

export const GetTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});

export type GetTaskResponse200 = z.infer<typeof GetTaskResponse200Schema>;

export const GetTaskRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.GET,
  responses: {
    200: GetTaskResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
