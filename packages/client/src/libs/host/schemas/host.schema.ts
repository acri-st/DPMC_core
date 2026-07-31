import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const OsTypeSchema = z.enum(['Linux', 'Darwin', 'Windows']);
export type OsType = z.infer<typeof OsTypeSchema>;

// A host's execution capability. Superset of the script-side
// ContainerRuntimeSchema: `Kubernetes` is host-only (a cluster runs OCI images
// and so serves Docker artifacts), never a script requirement.
export const HostContainerRuntimeSchema = z.enum([
  'Docker',
  'Apptainer',
  'Kubernetes',
  'None',
]);
export type HostContainerRuntime = z.infer<typeof HostContainerRuntimeSchema>;

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
  containerRuntime: HostContainerRuntimeSchema,
  lastHeartbeatAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Host = z.infer<typeof HostSchema>;
