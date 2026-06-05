import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteTaskResponse204Schema = ApiResponseSchema;

export type DeleteTaskResponse204 = z.infer<typeof DeleteTaskResponse204Schema>;

export const DeleteTaskRoute = {
  method: METHODS.DELETE,
  path: PATHS.TASK.DELETE,
  responses: {
    204: DeleteTaskResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
