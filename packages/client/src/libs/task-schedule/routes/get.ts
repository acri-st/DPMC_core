import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskScheduleSchema } from '../schemas';

export const GetTaskScheduleResponse200Schema = ApiResponseSchema.extend({
  data: TaskScheduleSchema,
});
export type GetTaskScheduleResponse200 = z.infer<
  typeof GetTaskScheduleResponse200Schema
>;

export const GetTaskScheduleRoute = {
  method: METHODS.GET,
  path: PATHS.TASK_SCHEDULE.GET,
  responses: {
    200: GetTaskScheduleResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
