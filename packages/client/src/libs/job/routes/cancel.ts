import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobSchema } from '../schemas';

export const CancelJobResponse200Schema = ApiResponseSchema.extend({
  data: JobSchema,
});
export type CancelJobResponse200 = z.infer<typeof CancelJobResponse200Schema>;

export const CancelJobRoute = {
  method: METHODS.POST,
  path: PATHS.JOB.CANCEL,
  body: z.object({}).optional(),
  responses: {
    200: CancelJobResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
