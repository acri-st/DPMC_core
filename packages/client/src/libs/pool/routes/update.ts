import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { PoolSchema, UpdatePoolBodySchema } from '../schemas';

export const UpdatePoolResponse200Schema = ApiResponseSchema.extend({
  data: PoolSchema,
});

export type UpdatePoolResponse200 = z.infer<typeof UpdatePoolResponse200Schema>;

export const UpdatePoolRoute = {
  method: METHODS.PATCH,
  path: PATHS.POOL.UPDATE,
  body: UpdatePoolBodySchema,
  responses: {
    200: UpdatePoolResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
