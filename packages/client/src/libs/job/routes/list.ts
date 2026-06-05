import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { JobSchema } from '../schemas';

export const ListJobResponse200Schema = ApiResponseSchema.extend({
  data: JobSchema.array(),
});

export const ListJobResponse500Schema = Error500Schema;

export type ListJobResponse200 = z.infer<typeof ListJobResponse200Schema>;
export type ListJobResponse500 = z.infer<typeof ListJobResponse500Schema>;
export type ListJobResponse = ListJobResponse200 | ListJobResponse500;

export const ListJobRoute = {
  method: METHODS.GET,
  path: PATHS.JOB.LIST,
  responses: {
    200: ListJobResponse200Schema,
    500: ListJobResponse500Schema,
  },
};
