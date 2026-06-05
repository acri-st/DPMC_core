import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ApiStatusSchema } from '../schemas';

export const StatusResponse200Schema = ApiResponseSchema.extend({
  data: ApiStatusSchema,
});

export const StatusResponse500Schema = Error500Schema;

export type StatusResponse200 = z.infer<typeof StatusResponse200Schema>;
export type StatusResponse500 = z.infer<typeof StatusResponse500Schema>;
export type StatusResponse = StatusResponse200 | StatusResponse500;

export const StatusRoute = {
  method: METHODS.GET,
  path: PATHS.STATUS.GET,
  responses: {
    200: StatusResponse200Schema,
    500: StatusResponse500Schema,
  },
};
