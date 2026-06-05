import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreatePoolBodySchema, PoolSchema } from '../schemas';

export const CreatePoolResponse201Schema = ApiResponseSchema.extend({
  data: PoolSchema,
});

export type CreatePoolResponse201 = z.infer<typeof CreatePoolResponse201Schema>;

export const CreatePoolRoute = {
  method: METHODS.POST,
  path: PATHS.POOL.CREATE,
  body: CreatePoolBodySchema,
  responses: {
    201: CreatePoolResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
