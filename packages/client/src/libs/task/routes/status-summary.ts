import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskStatusSummarySchema } from '../schemas';

export const TaskStatusSummaryResponse200Schema = ApiResponseSchema.extend({
  data: TaskStatusSummarySchema,
});
export type TaskStatusSummaryResponse200 = z.infer<
  typeof TaskStatusSummaryResponse200Schema
>;

export const TaskStatusSummaryRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.STATUS_SUMMARY,
  responses: {
    200: TaskStatusSummaryResponse200Schema,
    500: Error500Schema,
  },
};
