import { z } from 'zod';
import { ApiResponseSchema, Error401Schema, Error404Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema } from '../schemas';

export const HeartbeatHostBodySchema = z
  .object({
    cpuLoad: z.number().min(0).max(1).optional(),
    memUsage: z.number().min(0).max(1).optional(),
    diskUsage: z.number().min(0).max(1).optional(),
    ioBandwidth: z.number().min(0).optional(),
    runningJobs: z.number().int().min(0).optional(),
  })
  .strict()
  .optional();

export type HeartbeatHostBody = z.infer<typeof HeartbeatHostBodySchema>;

export const HeartbeatHostResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema,
});

export const HeartbeatHostResponse401Schema = Error401Schema;
export const HeartbeatHostResponse404Schema = Error404Schema;

export type HeartbeatHostResponse200 = z.infer<
  typeof HeartbeatHostResponse200Schema
>;
export type HeartbeatHostResponse401 = z.infer<
  typeof HeartbeatHostResponse401Schema
>;
export type HeartbeatHostResponse404 = z.infer<
  typeof HeartbeatHostResponse404Schema
>;
export type HeartbeatHostResponse =
  | HeartbeatHostResponse200
  | HeartbeatHostResponse401
  | HeartbeatHostResponse404;

export const HeartbeatHostRoute = {
  method: METHODS.POST,
  path: PATHS.HOST.HEARTBEAT,
  body: HeartbeatHostBodySchema,
  responses: {
    200: HeartbeatHostResponse200Schema,
    401: HeartbeatHostResponse401Schema,
    404: HeartbeatHostResponse404Schema,
  },
};
