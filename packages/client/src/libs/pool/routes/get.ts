import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { PoolDetailSchema } from '../schemas';

export const GetPoolResponse200Schema = ApiResponseSchema.extend({
  data: PoolDetailSchema,
});

export type GetPoolResponse200 = z.infer<typeof GetPoolResponse200Schema>;

export const GetPoolRoute = {
  method: METHODS.GET,
  path: PATHS.POOL.GET,
  responses: {
    200: GetPoolResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
