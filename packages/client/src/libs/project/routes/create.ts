import { z } from 'zod';
import {
  ApiResponseSchema,
  Error400Schema,
  Error409Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CreateProjectBodySchema, ProjectSchema } from '../schemas';

export const CreateProjectResponse201Schema = ApiResponseSchema.extend({
  data: ProjectSchema,
});

export type CreateProjectResponse201 = z.infer<
  typeof CreateProjectResponse201Schema
>;

export const CreateProjectRoute = {
  method: METHODS.POST,
  path: PATHS.PROJECT.CREATE,
  body: CreateProjectBodySchema,
  responses: {
    201: CreateProjectResponse201Schema,
    400: Error400Schema,
    409: Error409Schema,
    500: Error500Schema,
  },
};
