import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ExecutionTreeSchema } from '../schemas';

export const ExecutionTreeResponse200Schema = ApiResponseSchema.extend({
  data: ExecutionTreeSchema,
});
export type ExecutionTreeResponse200 = z.infer<
  typeof ExecutionTreeResponse200Schema
>;

export const ExecutionTreeRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.EXECUTION_TREE,
  responses: {
    200: ExecutionTreeResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
