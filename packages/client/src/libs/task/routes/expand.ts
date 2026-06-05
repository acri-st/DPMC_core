import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema } from '../schemas';

export const ExpandTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});
export type ExpandTaskResponse200 = z.infer<typeof ExpandTaskResponse200Schema>;

export const ExpandTaskRoute = {
  method: METHODS.POST,
  path: PATHS.TASK.EXPAND,
  body: z.object({}).optional(),
  responses: {
    200: ExpandTaskResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
