import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobSchema } from '../schemas';

export const PauseJobResponse200Schema = ApiResponseSchema.extend({
  data: JobSchema,
});
export type PauseJobResponse200 = z.infer<typeof PauseJobResponse200Schema>;

export const PauseJobRoute = {
  method: METHODS.POST,
  path: PATHS.JOB.PAUSE,
  body: z.object({}).optional(),
  responses: {
    200: PauseJobResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
