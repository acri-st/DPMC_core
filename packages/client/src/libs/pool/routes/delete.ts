import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeletePoolResponse204Schema = ApiResponseSchema;

export type DeletePoolResponse204 = z.infer<typeof DeletePoolResponse204Schema>;

export const DeletePoolRoute = {
  method: METHODS.DELETE,
  path: PATHS.POOL.DELETE,
  responses: {
    204: DeletePoolResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
