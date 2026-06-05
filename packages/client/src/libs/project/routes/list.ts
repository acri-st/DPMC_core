import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { ProjectSchema } from '../schemas';

export const ListProjectResponse200Schema = ApiResponseSchema.extend({
  data: ProjectSchema.array(),
});

export const ListProjectResponse500Schema = Error500Schema;

export type ListProjectResponse200 = z.infer<
  typeof ListProjectResponse200Schema
>;
export type ListProjectResponse500 = z.infer<
  typeof ListProjectResponse500Schema
>;
export type ListProjectResponse =
  | ListProjectResponse200
  | ListProjectResponse500;

export const ListProjectRoute = {
  method: METHODS.GET,
  path: PATHS.PROJECT.LIST,
  responses: {
    200: ListProjectResponse200Schema,
    500: ListProjectResponse500Schema,
  },
};
