import { z } from 'zod';
import { ApiResponseSchema, Error400Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { SchedulerHeartbeatBodySchema } from '../schemas';

export const SchedulerHeartbeatResponse200Schema = ApiResponseSchema.extend({
  data: z.object({ ok: z.literal(true) }),
});
export type SchedulerHeartbeatResponse200 = z.infer<
  typeof SchedulerHeartbeatResponse200Schema
>;

export const SchedulerHeartbeatRoute = {
  method: METHODS.POST,
  path: PATHS.SCHEDULER.HEARTBEAT,
  body: SchedulerHeartbeatBodySchema,
  responses: {
    200: SchedulerHeartbeatResponse200Schema,
    400: Error400Schema,
    500: Error500Schema,
  },
};
