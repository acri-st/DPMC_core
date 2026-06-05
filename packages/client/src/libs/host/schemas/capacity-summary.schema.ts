import { z } from 'zod';

export const CapacitySummarySchema = z.object({
  hostsTotal: z.number().int(),
  hostsUp: z.number().int(),
  totalCores: z.number().int(),
  availableCores: z.number().int(),
  totalRam: z.string(), // BigInt as string
  availableRam: z.string(),
  totalDisk: z.string(),
  availableDisk: z.string(),
  gpuHosts: z.number().int(),
});
export type CapacitySummary = z.infer<typeof CapacitySummarySchema>;
