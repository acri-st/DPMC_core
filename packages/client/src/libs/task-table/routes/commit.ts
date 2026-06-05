import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error403Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CommitTaskTableResultSchema } from '../schemas';

export const CommitTaskTableResponse200Schema = ApiResponseSchema.extend({
  data: CommitTaskTableResultSchema,
});

export type CommitTaskTableResponse200 = z.infer<
  typeof CommitTaskTableResponse200Schema
>;

export const CommitTaskTableRoute = {
  method: METHODS.POST,
  path: PATHS.TASK_TABLE.COMMIT,
  body: z.object({}),
  responses: {
    200: CommitTaskTableResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    403: Error403Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
