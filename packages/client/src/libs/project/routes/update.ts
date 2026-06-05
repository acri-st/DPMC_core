import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProjectSchema, UpdateProjectBodySchema } from '../schemas';

export const UpdateProjectResponse200Schema = ApiResponseSchema.extend({
  data: ProjectSchema,
});

export type UpdateProjectResponse200 = z.infer<
  typeof UpdateProjectResponse200Schema
>;

export const UpdateProjectRoute = {
  method: METHODS.PATCH,
  path: PATHS.PROJECT.UPDATE,
  body: UpdateProjectBodySchema,
  responses: {
    200: UpdateProjectResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
