import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { ContainerRuntimeSchema } from '../../processing-script/schemas';

export const OsTypeSchema = z.enum(['Linux', 'Darwin', 'Windows']);
export type OsType = z.infer<typeof OsTypeSchema>;

export const SchedulingPrioritySchema = z.enum(['Low', 'Medium', 'High']);
export type SchedulingPriority = z.infer<typeof SchedulingPrioritySchema>;

export const HostStatusSchema = z.enum(['Up', 'Busy', 'Off', 'Maintenance']);
export type HostStatus = z.infer<typeof HostStatusSchema>;

export const HostSchema = z.object({
  id: IdSchema,
  dataCenterId: IdSchema,
  hostname: z.string(),
  ipAddress: z.string(),
  osType: OsTypeSchema,
  osVersion: z.string(),
  schedulingPriority: SchedulingPrioritySchema,
  status: HostStatusSchema,
  processingDir: z.string(),
  cacheDir: z.string(),
  nbCores: z.number(),
  ram: z.union([z.number(), z.bigint(), z.string()]),
  disk: z.union([z.number(), z.bigint(), z.string()]),
  hasGpu: z.boolean(),
  gpuCount: z.number().int(),
  gpuModel: z.string().nullable(),
  containerRuntime: ContainerRuntimeSchema,
  lastHeartbeatAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Host = z.infer<typeof HostSchema>;
