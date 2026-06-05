import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema } from '../schemas';

export const TriggerTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});

export type TriggerTaskResponse200 = z.infer<
  typeof TriggerTaskResponse200Schema
>;

export const TriggerTaskRoute = {
  method: METHODS.POST,
  path: PATHS.TASK.TRIGGER,
  body: z.object({}).optional(),
  responses: {
    200: TriggerTaskResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
