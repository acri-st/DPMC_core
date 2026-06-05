import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema } from '../schemas';

export const ListTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema.array(),
});

export type ListTaskResponse200 = z.infer<typeof ListTaskResponse200Schema>;

export const ListTaskRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.LIST,
  responses: {
    200: ListTaskResponse200Schema,
    500: Error500Schema,
  },
};
