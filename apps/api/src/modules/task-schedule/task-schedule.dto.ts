import {
  CreateTaskScheduleBodySchema,
  CreateTaskScheduleResponse201Schema,
  GetTaskScheduleResponse200Schema,
  ListTaskScheduleResponse200Schema,
  UpdateTaskScheduleBodySchema,
  UpdateTaskScheduleResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
