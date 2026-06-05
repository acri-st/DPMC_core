import {
  SchedulerExpandTaskResponse200Schema,
  SchedulerHeartbeatBodySchema,
  SchedulerHeartbeatResponse200Schema,
  SchedulerStatusResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export class SchedulerHeartbeatBody extends createZodDto(
  SchedulerHeartbeatBodySchema,
) {}

export const SchedulerHeartbeatResponseSchema =
  SchedulerHeartbeatResponse200Schema;
export class SchedulerHeartbeatResponse extends createZodDto(
  SchedulerHeartbeatResponseSchema,
) {}

export const SchedulerStatusResponseSchema = SchedulerStatusResponse200Schema;
export class SchedulerStatusResponse extends createZodDto(
  SchedulerStatusResponseSchema,
) {}

export const SchedulerExpandTaskResponseSchema =
  SchedulerExpandTaskResponse200Schema;
export class SchedulerExpandTaskResponse extends createZodDto(
  SchedulerExpandTaskResponseSchema,
) {}
