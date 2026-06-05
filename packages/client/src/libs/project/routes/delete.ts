import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';

export const DeleteProjectResponse204Schema = ApiResponseSchema;

export type DeleteProjectResponse204 = z.infer<
  typeof DeleteProjectResponse204Schema
>;

export const DeleteProjectRoute = {
  method: METHODS.DELETE,
  path: PATHS.PROJECT.DELETE,
  responses: {
    204: DeleteProjectResponse204Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
