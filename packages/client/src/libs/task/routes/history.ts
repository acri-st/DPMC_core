import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { TaskHistoryEntrySchema } from '../schemas';

export const TaskHistoryResponse200Schema = ApiResponseSchema.extend({
  data: TaskHistoryEntrySchema.array(),
});
export type TaskHistoryResponse200 = z.infer<
  typeof TaskHistoryResponse200Schema
>;

export const TaskHistoryRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.HISTORY,
  responses: {
    200: TaskHistoryResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
