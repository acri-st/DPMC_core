import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const HostMetricsSchema = z.object({
  id: IdSchema,
  hostId: IdSchema,
  cpuLoad: z.number(),
  memUsage: z.number(),
  diskUsage: z.number(),
  ioBandwidth: z.number().nullable(),
  runningJobs: z.number().int(),
  sampledAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});
export type HostMetrics = z.infer<typeof HostMetricsSchema>;
