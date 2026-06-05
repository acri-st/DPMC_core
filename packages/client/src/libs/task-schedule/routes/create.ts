import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateTaskScheduleBodySchema, TaskScheduleSchema } from '../schemas';

export const CreateTaskScheduleResponse201Schema = ApiResponseSchema.extend({
  data: TaskScheduleSchema,
});
export type CreateTaskScheduleResponse201 = z.infer<
  typeof CreateTaskScheduleResponse201Schema
>;

export const CreateTaskScheduleRoute = {
  method: METHODS.POST,
  path: PATHS.TASK_SCHEDULE.CREATE,
  body: CreateTaskScheduleBodySchema,
  responses: {
    201: CreateTaskScheduleResponse201Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
