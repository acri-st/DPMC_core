import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProjectSchema } from '../schemas';

export const SetDefaultProjectResponse200Schema = ApiResponseSchema.extend({
  data: ProjectSchema,
});

export type SetDefaultProjectResponse200 = z.infer<
  typeof SetDefaultProjectResponse200Schema
>;

export const SetDefaultProjectRoute = {
  method: METHODS.POST,
  path: PATHS.PROJECT.SET_DEFAULT,
  body: z.object({}).optional(),
  responses: {
    200: SetDefaultProjectResponse200Schema,
    400: Error400Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
