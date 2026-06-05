import { z } from 'zod';
import { ApiResponseSchema, Error401Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { CurrentUserSchema } from '../schemas';

export const GetCurrentUserResponse200Schema = ApiResponseSchema.extend({
  data: CurrentUserSchema,
});

export const GetCurrentUserResponse401Schema = Error401Schema;
export const GetCurrentUserResponse500Schema = Error500Schema;

export type GetCurrentUserResponse200 = z.infer<
  typeof GetCurrentUserResponse200Schema
>;
export type GetCurrentUserResponse401 = z.infer<
  typeof GetCurrentUserResponse401Schema
>;
export type GetCurrentUserResponse500 = z.infer<
  typeof GetCurrentUserResponse500Schema
>;
export type GetCurrentUserResponse =
  | GetCurrentUserResponse200
  | GetCurrentUserResponse401
  | GetCurrentUserResponse500;

export const GetCurrentUserRoute = {
  method: METHODS.GET,
  path: PATHS.AUTH.ME,
  responses: {
    200: GetCurrentUserResponse200Schema,
    401: GetCurrentUserResponse401Schema,
    500: GetCurrentUserResponse500Schema,
  },
};
