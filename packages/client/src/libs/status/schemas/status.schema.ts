import { z } from 'zod';

export const Status = z.enum(['OK', 'KO', 'DEGRADED']);

export const ApiServiceSchema = z.object({
  name: z.string(),
  status: Status,
});

export const ApiStatusSchema = z.object({
  status: Status,
  version: z.string(),
  uptime: z.string(),
  services: ApiServiceSchema.array(),
});

export type Status = z.infer<typeof Status>;
export type ApiService = z.infer<typeof ApiServiceSchema>;
export type ApiStatus = z.infer<typeof ApiStatusSchema>;
