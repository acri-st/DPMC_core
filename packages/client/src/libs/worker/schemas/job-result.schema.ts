import { z } from 'zod';

// Allowlist: zod DROPS undeclared keys without error. A new worker metric
// must be declared here in the same change or it silently vanishes.
export const JobResultMetricsSchema = z.object({
  avgPower: z.number().nullable().optional(),
  dataVolume: z.string().nullable().optional(),
  cpuSeconds: z.number().nullable().optional(),
  peakRssBytes: z.string().nullable().optional(),
  diskReadBytes: z.string().nullable().optional(),
  diskWriteBytes: z.string().nullable().optional(),
  netRxBytes: z.string().nullable().optional(),
  netTxBytes: z.string().nullable().optional(),
  stageInBytes: z.string().nullable().optional(),
  stageOutBytes: z.string().nullable().optional(),
});

export const JobResultBodySchema = z.object({
  status: z.enum(['Success', 'Failed', 'Cancelled']),
  exitCode: z.number().int().nullable(),
  errorMessage: z.string().nullable().optional(),
  metrics: JobResultMetricsSchema.optional(),
});
export type JobResultBody = z.infer<typeof JobResultBodySchema>;
