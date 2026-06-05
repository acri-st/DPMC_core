import { z } from 'zod';
import {
  ApiResponseSchema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { WorkerDispatchSchema } from '../schemas';

export const NextJobResponse200Schema = ApiResponseSchema.extend({
  data: WorkerDispatchSchema.nullable(),
});
export type NextJobResponse200 = z.infer<typeof NextJobResponse200Schema>;

export const NextJobRoute = {
  method: METHODS.GET,
  path: PATHS.WORKER.NEXT_JOB,
  responses: {
    200: NextJobResponse200Schema,
    401: Error401Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
