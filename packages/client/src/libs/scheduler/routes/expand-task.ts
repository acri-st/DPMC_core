import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskSchema } from '../../task/schemas';

export const SchedulerExpandTaskResponse200Schema = ApiResponseSchema.extend({
  data: TaskSchema,
});
export type SchedulerExpandTaskResponse200 = z.infer<
  typeof SchedulerExpandTaskResponse200Schema
>;

export const SchedulerExpandTaskRoute = {
  method: METHODS.POST,
  path: PATHS.SCHEDULER.EXPAND_TASK,
  body: z.object({}).optional(),
  responses: {
    200: SchedulerExpandTaskResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
