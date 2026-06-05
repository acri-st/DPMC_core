import { z } from 'zod';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema } from '../schemas';

export const ListHostResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema.array(),
});

export const ListHostResponse500Schema = Error500Schema;

export type ListHostResponse200 = z.infer<typeof ListHostResponse200Schema>;
export type ListHostResponse500 = z.infer<typeof ListHostResponse500Schema>;
export type ListHostResponse = ListHostResponse200 | ListHostResponse500;

export const ListHostRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.LIST,
  responses: {
    200: ListHostResponse200Schema,
    500: ListHostResponse500Schema,
  },
};
