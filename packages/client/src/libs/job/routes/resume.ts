import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobSchema } from '../schemas';

export const ResumeJobResponse200Schema = ApiResponseSchema.extend({
  data: JobSchema,
});
export type ResumeJobResponse200 = z.infer<typeof ResumeJobResponse200Schema>;

export const ResumeJobRoute = {
  method: METHODS.POST,
  path: PATHS.JOB.RESUME,
  body: z.object({}).optional(),
  responses: {
    200: ResumeJobResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
