import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProjectSchema } from '../schemas';

export const GetProjectResponse200Schema = ApiResponseSchema.extend({
  data: ProjectSchema,
});

export const GetProjectResponse404Schema = Error404Schema;
export const GetProjectResponse500Schema = Error500Schema;

export type GetProjectResponse200 = z.infer<typeof GetProjectResponse200Schema>;
export type GetProjectResponse404 = z.infer<typeof GetProjectResponse404Schema>;
export type GetProjectResponse500 = z.infer<typeof GetProjectResponse500Schema>;
export type GetProjectResponse =
  | GetProjectResponse200
  | GetProjectResponse404
  | GetProjectResponse500;

export const GetProjectRoute = {
  method: METHODS.GET,
  path: PATHS.PROJECT.GET,
  responses: {
    200: GetProjectResponse200Schema,
    404: GetProjectResponse404Schema,
    500: GetProjectResponse500Schema,
  },
};
