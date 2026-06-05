import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const HostLogLevelSchema = z.enum([
  'Debug',
  'Info',
  'Warning',
  'Error',
  'Critical',
]);
export type HostLogLevel = z.infer<typeof HostLogLevelSchema>;

export const HostLogSchema = z.object({
  id: IdSchema,
  hostId: IdSchema,
  jobId: IdSchema.nullable().optional(),
  level: HostLogLevelSchema,
  message: z.string(),
  loggedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type HostLog = z.infer<typeof HostLogSchema>;

export const HostLogEntrySchema = z.object({
  level: HostLogLevelSchema,
  message: z.string().min(1).max(8192),
  loggedAt: z.coerce.date(),
  jobId: IdSchema.nullable().optional(),
});

export type HostLogEntry = z.infer<typeof HostLogEntrySchema>;
