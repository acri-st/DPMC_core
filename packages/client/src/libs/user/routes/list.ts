import { z } from 'zod';
import { ApiResponseSchema, Error401Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { AppUserSchema } from '../schemas';

export const ListUsersResponse200Schema = ApiResponseSchema.extend({
  data: AppUserSchema.array(),
});

export const ListUsersResponse401Schema = Error401Schema;
export const ListUsersResponse403Schema = ApiResponseSchema.extend({
  status: z.literal(403),
});
export const ListUsersResponse500Schema = Error500Schema;

export type ListUsersResponse200 = z.infer<typeof ListUsersResponse200Schema>;
export type ListUsersResponse =
  | ListUsersResponse200
  | z.infer<typeof ListUsersResponse401Schema>
  | z.infer<typeof ListUsersResponse403Schema>
  | z.infer<typeof ListUsersResponse500Schema>;

export const ListUsersRoute = {
  method: METHODS.GET,
  path: PATHS.USER.LIST,
  responses: {
    200: ListUsersResponse200Schema,
    401: ListUsersResponse401Schema,
    403: ListUsersResponse403Schema,
    500: ListUsersResponse500Schema,
  },
};
