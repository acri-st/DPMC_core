import { z } from 'zod';

export const Co2GroupBySchema = z.enum(['project', 'chain', 'task']);
export type Co2GroupBy = z.infer<typeof Co2GroupBySchema>;

export const Co2QuerySchema = z.object({
  groupBy: Co2GroupBySchema.default('project'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type Co2Query = z.infer<typeof Co2QuerySchema>;

export const Co2AggregateSchema = z.object({
  groupBy: Co2GroupBySchema,
  bucket: z.string(),
  bucketName: z.string().nullable(),
  energyWh: z.number(),
  co2Grams: z.number(),
  cpuSeconds: z.number(),
});
export type Co2Aggregate = z.infer<typeof Co2AggregateSchema>;
