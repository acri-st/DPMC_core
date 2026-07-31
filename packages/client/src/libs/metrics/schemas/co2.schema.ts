import { z } from 'zod';

export const Co2GroupBySchema = z.enum(['project', 'chain', 'task']);
export type Co2GroupBy = z.infer<typeof Co2GroupBySchema>;

export const Co2QuerySchema = z.object({
  groupBy: Co2GroupBySchema.default('project'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type Co2Query = z.infer<typeof Co2QuerySchema>;

// cadvisor = pod-interface bytes; staged = worker-moved bytes only.
export const TransferSourceSchema = z.enum(['cadvisor', 'staged', 'none']);
export type TransferSource = z.infer<typeof TransferSourceSchema>;

// ingress/egress include in-cluster traffic (MinIO staging) — not WAN.
export const Co2ConcernSchema = z.object({
  cpu: z.number(),
  gpu: z.number(),
  ingress: z.number(),
  egress: z.number(),
});
export type Co2Concern = z.infer<typeof Co2ConcernSchema>;

export const Co2AggregateSchema = z.object({
  groupBy: Co2GroupBySchema,
  bucket: z.number(),
  bucketName: z.string().nullable(),
  energyWh: z.number(),
  co2Grams: z.number(),
  cpuSeconds: z.number(),
  energyWhByConcern: Co2ConcernSchema,
  co2GramsByConcern: Co2ConcernSchema,
});
export type Co2Aggregate = z.infer<typeof Co2AggregateSchema>;
