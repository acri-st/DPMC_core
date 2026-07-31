import { z } from 'zod';

export const BatchStatusSummarySchema = z.object({
  Pending: z.number().int(),
  Running: z.number().int(),
  Success: z.number().int(),
  Failed: z.number().int(),
  Cancelled: z.number().int(),
});
export type BatchStatusSummary = z.infer<typeof BatchStatusSummarySchema>;
