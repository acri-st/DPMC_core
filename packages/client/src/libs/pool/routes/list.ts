import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { PoolSchema } from '../schemas';

export const ListPoolResponse200Schema = ApiResponseSchema.extend({
  data: PoolSchema.array(),
});

export type ListPoolResponse200 = z.infer<typeof ListPoolResponse200Schema>;

export const ListPoolRoute = {
  method: METHODS.GET,
  path: PATHS.POOL.LIST,
  responses: {
    200: ListPoolResponse200Schema,
    500: Error500Schema,
  },
};
