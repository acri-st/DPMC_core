import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateTaskBodySchema, TaskSchema } from '../schemas';

export const CreateTaskResponse201Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});

export type CreateTaskResponse201 = z.infer<typeof CreateTaskResponse201Schema>;

export const CreateTaskRoute = {
  method: METHODS.POST,
  path: PATHS.TASK.CREATE,
  body: CreateTaskBodySchema,
  responses: {
    201: CreateTaskResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
