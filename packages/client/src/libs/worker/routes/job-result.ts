import { z } from 'zod';
import { IdSchema } from '../../_shared';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobResultBodySchema } from '../schemas';

export const JobResultResponse200Schema = ApiResponseSchema.extend({
  data: z.object({ jobId: IdSchema, status: z.string() }),
});
export type JobResultResponse200 = z.infer<typeof JobResultResponse200Schema>;

export const JobResultRoute = {
  method: METHODS.POST,
  path: PATHS.WORKER.JOB_RESULT,
  body: JobResultBodySchema,
  responses: {
    200: JobResultResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
