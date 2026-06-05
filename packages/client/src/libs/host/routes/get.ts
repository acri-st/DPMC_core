import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema } from '../schemas';

export const GetHostResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema,
});

export const GetHostResponse404Schema = Error404Schema;
export const GetHostResponse500Schema = Error500Schema;

export type GetHostResponse200 = z.infer<typeof GetHostResponse200Schema>;
export type GetHostResponse404 = z.infer<typeof GetHostResponse404Schema>;
export type GetHostResponse500 = z.infer<typeof GetHostResponse500Schema>;
export type GetHostResponse =
  | GetHostResponse200
  | GetHostResponse404
  | GetHostResponse500;

export const GetHostRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.GET,
  responses: {
    200: GetHostResponse200Schema,
    404: GetHostResponse404Schema,
    500: GetHostResponse500Schema,
  },
};
