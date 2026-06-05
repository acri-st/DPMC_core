import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobOutputsBodySchema, RecordedProductSchema } from '../schemas';

export const JobOutputsResponse200Schema = ApiResponseSchema.extend({
  data: z.object({ products: z.array(RecordedProductSchema) }),
});
export type JobOutputsResponse200 = z.infer<typeof JobOutputsResponse200Schema>;

export const JobOutputsRoute = {
  method: METHODS.POST,
  path: PATHS.WORKER.JOB_OUTPUTS,
  body: JobOutputsBodySchema,
  responses: {
    200: JobOutputsResponse200Schema,
    400: Error400Schema,
    401: Error401Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
