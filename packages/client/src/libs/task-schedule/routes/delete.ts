import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteTaskScheduleResponse204Schema = ApiResponseSchema.extend({
  data: z.null(),
});
export type DeleteTaskScheduleResponse204 = z.infer<
  typeof DeleteTaskScheduleResponse204Schema
>;

export const DeleteTaskScheduleRoute = {
  method: METHODS.DELETE,
  path: PATHS.TASK_SCHEDULE.DELETE,
  responses: {
    204: DeleteTaskScheduleResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
