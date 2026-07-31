import {
  CreateTaskScheduleBodySchema,
  CreateTaskScheduleResponse201Schema,
  GetTaskScheduleResponse200Schema,
  ListTaskScheduleResponse200Schema,
  TaskKindSchema,
  UpdateTaskScheduleBodySchema,
  UpdateTaskScheduleResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  enumArrayQueryParam,
  optionalBoolean,
} from '@/common/utils/pagination';

export const TaskScheduleListQuerySchema = PaginationQuerySchema.extend({
  kind: enumArrayQueryParam(TaskKindSchema),
  enabled: optionalBoolean(),
});
export type TaskScheduleListQuery = z.infer<typeof TaskScheduleListQuerySchema>;
export class TaskScheduleListQueryDto extends createZodDto(
  TaskScheduleListQuerySchema,
) {}

export const ListTaskScheduleResponseSchema = ListTaskScheduleResponse200Schema;
export class ListTaskScheduleResponse extends createZodDto(
  ListTaskScheduleResponseSchema,
) {}

export const GetTaskScheduleResponseSchema = GetTaskScheduleResponse200Schema;
export class GetTaskScheduleResponse extends createZodDto(
  GetTaskScheduleResponseSchema,
) {}

// CreateTaskScheduleBody is a discriminated union — createZodDto chokes on it,
// so we expose the raw schema (validated at the controller via ZodValidationPipe)
// and the inferred type.
export const CreateTaskScheduleBodyZodSchema = CreateTaskScheduleBodySchema;
export type CreateTaskScheduleBody = z.infer<
  typeof CreateTaskScheduleBodySchema
>;
export const CreateTaskScheduleResponseSchema =
  CreateTaskScheduleResponse201Schema;
export class CreateTaskScheduleResponse extends createZodDto(
  CreateTaskScheduleResponseSchema,
) {}

export class UpdateTaskScheduleBody extends createZodDto(
  UpdateTaskScheduleBodySchema,
) {}
export const UpdateTaskScheduleResponseSchema =
  UpdateTaskScheduleResponse200Schema;
export class UpdateTaskScheduleResponse extends createZodDto(
  UpdateTaskScheduleResponseSchema,
) {}
