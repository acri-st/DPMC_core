import {
  ActiveHostResponse200Schema,
  CapacitySummaryHostResponse200Schema,
  GetHostResponse200Schema,
  HeartbeatHostResponse200Schema,
  IngestHostLogsBodySchema,
  IngestHostLogsResponse200Schema,
  ListHostLogsQuerySchema,
  ListHostLogsResponse200Schema,
  ListHostBatchesQuerySchema,
  ListHostBatchesResponse200Schema,
  ListHostMetricsQuerySchema,
  ListHostMetricsResponse200Schema,
  ListHostResponse200Schema,
  RegisterHostBodySchema,
  RegisterHostResponse200Schema,
  StatusListHostResponse200Schema,
  UpdateHostStatusBodySchema,
  UpdateHostStatusResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import { z as zod } from 'zod';
import { HostContainerRuntimeSchema, HostStatusSchema } from '@dpmc/client';
import {
  PaginationQuerySchema,
  enumArrayQueryParam,
} from '@/common/utils/pagination';

// GET /host
export const ListHostResponseSchema = ListHostResponse200Schema;
export class ListHostResponse extends createZodDto(ListHostResponseSchema) {}

export const HostListQuerySchema = PaginationQuerySchema.extend({
  status: enumArrayQueryParam(HostStatusSchema),
  containerRuntime: enumArrayQueryParam(HostContainerRuntimeSchema),
});
export type HostListQuery = zod.infer<typeof HostListQuerySchema>;
export class HostListQueryDto extends createZodDto(HostListQuerySchema) {}

// GET /host/:id
export const GetHostResponseSchema = GetHostResponse200Schema;
export class GetHostResponse extends createZodDto(GetHostResponseSchema) {}

// POST /host/register
export type RegisterHostInput = z.infer<typeof RegisterHostBodySchema>;
export class RegisterHostBody extends createZodDto(RegisterHostBodySchema) {}
export const RegisterHostResponseSchema = RegisterHostResponse200Schema;
export class RegisterHostResponse extends createZodDto(
  RegisterHostResponseSchema,
) {}

// PATCH /host/:id/status
export type UpdateHostStatusInput = z.infer<typeof UpdateHostStatusBodySchema>;
export class UpdateHostStatusBody extends createZodDto(
  UpdateHostStatusBodySchema,
) {}
export const UpdateHostStatusResponseSchema = UpdateHostStatusResponse200Schema;
export class UpdateHostStatusResponse extends createZodDto(
  UpdateHostStatusResponseSchema,
) {}

// POST /host/:id/heartbeat
export const HeartbeatHostResponseSchema = HeartbeatHostResponse200Schema;
export class HeartbeatHostResponse extends createZodDto(
  HeartbeatHostResponseSchema,
) {}

export const HeartbeatHostBodyZodSchema = zod
  .object({
    cpuLoad: zod.number().min(0).max(1).optional(),
    memUsage: zod.number().min(0).max(1).optional(),
    diskUsage: zod.number().min(0).max(1).optional(),
    ioBandwidth: zod.number().min(0).optional(),
    runningJobs: zod.number().int().min(0).optional(),
  })
  .strict()
  .default({});
export class HeartbeatHostBody extends createZodDto(
  HeartbeatHostBodyZodSchema,
) {}

// POST /host/:id/logs
export type IngestHostLogsInput = z.infer<typeof IngestHostLogsBodySchema>;
export class IngestHostLogsBody extends createZodDto(
  IngestHostLogsBodySchema,
) {}
export const IngestHostLogsResponseSchema = IngestHostLogsResponse200Schema;
export class IngestHostLogsResponse extends createZodDto(
  IngestHostLogsResponseSchema,
) {}

// GET /host/:id/logs
export type ListHostLogsInput = z.infer<typeof ListHostLogsQuerySchema>;
export class ListHostLogsQuery extends createZodDto(ListHostLogsQuerySchema) {}
export const ListHostLogsResponseSchema = ListHostLogsResponse200Schema;
export class ListHostLogsResponse extends createZodDto(
  ListHostLogsResponseSchema,
) {}

// GET /host/capacity-summary
export const CapacitySummaryHostResponseSchema =
  CapacitySummaryHostResponse200Schema;
export class CapacitySummaryHostResponse extends createZodDto(
  CapacitySummaryHostResponseSchema,
) {}

// GET /host/status
export const StatusListHostResponseSchema = StatusListHostResponse200Schema;
export class StatusListHostResponse extends createZodDto(
  StatusListHostResponseSchema,
) {}

// GET /host/active
export const ActiveHostResponseSchema = ActiveHostResponse200Schema;
export class ActiveHostResponse extends createZodDto(
  ActiveHostResponseSchema,
) {}

// GET /host/:id/metrics
export class ListHostMetricsQuery extends createZodDto(
  ListHostMetricsQuerySchema,
) {}
export const ListHostMetricsResponseSchema = ListHostMetricsResponse200Schema;
export class ListHostMetricsResponse extends createZodDto(
  ListHostMetricsResponseSchema,
) {}

// GET /host/:id/batches
export class ListHostBatchesQuery extends createZodDto(
  ListHostBatchesQuerySchema,
) {}
export const ListHostBatchesResponseSchema = ListHostBatchesResponse200Schema;
export class ListHostBatchesResponse extends createZodDto(
  ListHostBatchesResponseSchema,
) {}
