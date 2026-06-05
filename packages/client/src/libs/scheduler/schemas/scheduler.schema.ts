import { z } from 'zod';

export const SchedulerStatusSchema = z.object({
  lastTickAt: z.coerce.date(),
  queueDepth: z.number().int(),
  runningCount: z.number().int(),
  healthy: z.boolean(),
});
export type SchedulerStatus = z.infer<typeof SchedulerStatusSchema>;

export const SchedulerHeartbeatBodySchema = z.object({
  queueDepth: z.number().int().min(0),
  runningCount: z.number().int().min(0),
});
export type SchedulerHeartbeatBody = z.infer<
  typeof SchedulerHeartbeatBodySchema
>;
