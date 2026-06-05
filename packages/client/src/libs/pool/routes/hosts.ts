import { z } from 'zod';
import {
  ApiResponseSchema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { PoolSchema } from '../schemas';

// POST /pool/:id/hosts/:hostId — idempotent upsert
export const AddPoolHostResponse200Schema = ApiResponseSchema.extend({
  data: PoolSchema,
});
export type AddPoolHostResponse200 = z.infer<
  typeof AddPoolHostResponse200Schema
>;
export const AddPoolHostRoute = {
  method: METHODS.POST,
  path: PATHS.POOL.ADD_HOST,
  body: z.object({}).optional(),
  responses: {
    200: AddPoolHostResponse200Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};

// DELETE /pool/:id/hosts/:hostId
export const RemovePoolHostResponse204Schema = ApiResponseSchema;
export type RemovePoolHostResponse204 = z.infer<
  typeof RemovePoolHostResponse204Schema
>;
export const RemovePoolHostRoute = {
  method: METHODS.DELETE,
  path: PATHS.POOL.REMOVE_HOST,
  responses: {
    204: RemovePoolHostResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
