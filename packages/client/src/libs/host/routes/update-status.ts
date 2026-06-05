import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema, HostStatusSchema } from '../schemas';

export const UpdateHostStatusBodySchema = z.object({
  status: HostStatusSchema,
});

export type UpdateHostStatusBody = z.infer<typeof UpdateHostStatusBodySchema>;

export const UpdateHostStatusResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema,
});

export const UpdateHostStatusResponse404Schema = Error404Schema;
export const UpdateHostStatusResponse500Schema = Error500Schema;

export type UpdateHostStatusResponse200 = z.infer<
  typeof UpdateHostStatusResponse200Schema
>;
export type UpdateHostStatusResponse404 = z.infer<
  typeof UpdateHostStatusResponse404Schema
>;
export type UpdateHostStatusResponse500 = z.infer<
  typeof UpdateHostStatusResponse500Schema
>;
export type UpdateHostStatusResponse =
  | UpdateHostStatusResponse200
  | UpdateHostStatusResponse404
  | UpdateHostStatusResponse500;

export const UpdateHostStatusRoute = {
  method: METHODS.PATCH,
  path: PATHS.HOST.UPDATE_STATUS,
  body: UpdateHostStatusBodySchema,
  responses: {
    200: UpdateHostStatusResponse200Schema,
    404: UpdateHostStatusResponse404Schema,
    500: UpdateHostStatusResponse500Schema,
  },
};
