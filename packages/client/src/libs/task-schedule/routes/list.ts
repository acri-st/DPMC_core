import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskScheduleSchema } from '../schemas';

export const ListTaskScheduleResponse200Schema = ApiResponseSchema.extend({
  data: TaskScheduleSchema.array(),
});
export type ListTaskScheduleResponse200 = z.infer<
  typeof ListTaskScheduleResponse200Schema
>;

export const ListTaskScheduleRoute = {
  method: METHODS.GET,
  path: PATHS.TASK_SCHEDULE.LIST,
  responses: { 200: ListTaskScheduleResponse200Schema, 500: Error500Schema },
};
