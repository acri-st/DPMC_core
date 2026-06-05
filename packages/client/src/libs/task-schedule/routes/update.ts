import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskScheduleSchema, UpdateTaskScheduleBodySchema } from '../schemas';

export const UpdateTaskScheduleResponse200Schema = ApiResponseSchema.extend({
  data: TaskScheduleSchema,
});
export type UpdateTaskScheduleResponse200 = z.infer<
  typeof UpdateTaskScheduleResponse200Schema
>;

export const UpdateTaskScheduleRoute = {
  method: METHODS.PATCH,
  path: PATHS.TASK_SCHEDULE.UPDATE,
  body: UpdateTaskScheduleBodySchema,
  responses: {
    200: UpdateTaskScheduleResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
