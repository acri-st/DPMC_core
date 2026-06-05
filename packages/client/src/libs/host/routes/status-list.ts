import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { ApiResponseSchema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostStatusSchema } from '../schemas';

export const StatusListHostResponse200Schema = ApiResponseSchema.extend({
  data: z
    .object({
      id: IdSchema,
      hostname: z.string(),
      status: HostStatusSchema,
      lastHeartbeatAt: z.coerce.date().nullable(),
    })
    .array(),
});
export type StatusListHostResponse200 = z.infer<
  typeof StatusListHostResponse200Schema
>;

export const StatusListHostRoute = {
  method: METHODS.GET,
  path: PATHS.HOST.STATUS_LIST,
  responses: {
    200: StatusListHostResponse200Schema,
    500: Error500Schema,
  },
};
