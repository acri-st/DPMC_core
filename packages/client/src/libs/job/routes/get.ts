import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobSchema } from '../schemas';

export const GetJobResponse200Schema = ApiResponseSchema.extend({
  data: JobSchema,
});

export const GetJobResponse404Schema = Error404Schema;
export const GetJobResponse500Schema = Error500Schema;

export type GetJobResponse200 = z.infer<typeof GetJobResponse200Schema>;
export type GetJobResponse404 = z.infer<typeof GetJobResponse404Schema>;
export type GetJobResponse500 = z.infer<typeof GetJobResponse500Schema>;
export type GetJobResponse =
  | GetJobResponse200
  | GetJobResponse404
  | GetJobResponse500;

export const GetJobRoute = {
  method: METHODS.GET,
  path: PATHS.JOB.GET,
  responses: {
    200: GetJobResponse200Schema,
    404: GetJobResponse404Schema,
    500: GetJobResponse500Schema,
  },
};
