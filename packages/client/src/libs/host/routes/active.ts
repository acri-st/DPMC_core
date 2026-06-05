import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema } from '../schemas';

export const ActiveHostResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema.array(),
});
export type ActiveHostResponse200 = z.infer<typeof ActiveHostResponse200Schema>;

export const ActiveHostRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.ACTIVE,
  responses: {
    200: ActiveHostResponse200Schema,
    500: Error500Schema,
  },
};
