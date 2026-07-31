import {
  CreateTaskBodySchema,
  CreateTaskResponse201Schema,
  DeleteTaskResponse204Schema,
  ExpandTaskResponse200Schema,
  ExecutionTreeResponse200Schema,
  GetTaskResponse200Schema,
  ListTaskResponse200Schema,
  TaskBatchesResponse200Schema,
  TaskHistoryResponse200Schema,
  TaskStatusSummaryResponse200Schema,
  TaskStatusSchema,
  TaskKindSchema,
  TriggerTaskResponse200Schema,
  UpdateTaskBodySchema,
  UpdateTaskResponse200Schema,
  UpdateTaskPriorityBodySchema,
  UpdateTaskPriorityResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  enumArrayQueryParam,
} from '@/common/utils/pagination';

export const ListTaskResponseSchema = ListTaskResponse200Schema;
export class ListTaskResponse extends createZodDto(ListTaskResponseSchema) {}

export const GetTaskResponseSchema = GetTaskResponse200Schema;
export class GetTaskResponse extends createZodDto(GetTaskResponseSchema) {}

// CreateTaskBody is a discriminated union — createZodDto chokes on it,
// so we expose the inferred type and validate via the existing ValidationPipe
// at the controller boundary by providing the schema below.
export const CreateTaskBodyZodSchema = CreateTaskBodySchema;
export type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>;
export const CreateTaskResponseSchema = CreateTaskResponse201Schema;
export class CreateTaskResponse extends createZodDto(
  CreateTaskResponseSchema,
) {}

export class UpdateTaskBody extends createZodDto(UpdateTaskBodySchema) {}
export const UpdateTaskResponseSchema = UpdateTaskResponse200Schema;
export class UpdateTaskResponse extends createZodDto(
  UpdateTaskResponseSchema,
) {}

export const DeleteTaskResponseSchema = DeleteTaskResponse204Schema;
export class DeleteTaskResponse extends createZodDto(
  DeleteTaskResponseSchema,
) {}

export const TriggerTaskResponseSchema = TriggerTaskResponse200Schema;
export class TriggerTaskResponse extends createZodDto(
  TriggerTaskResponseSchema,
) {}

export const ExpandTaskResponseSchema = ExpandTaskResponse200Schema;
export class ExpandTaskResponse extends createZodDto(
  ExpandTaskResponseSchema,
) {}

export class UpdateTaskPriorityBody extends createZodDto(
  UpdateTaskPriorityBodySchema,
) {}
export const UpdateTaskPriorityResponseSchema =
  UpdateTaskPriorityResponse200Schema;
export class UpdateTaskPriorityResponse extends createZodDto(
  UpdateTaskPriorityResponseSchema,
) {}

export const ExecutionTreeResponseSchema = ExecutionTreeResponse200Schema;
export class ExecutionTreeResponse extends createZodDto(
  ExecutionTreeResponseSchema,
) {}

export const TaskBatchesResponseSchema = TaskBatchesResponse200Schema;
export class TaskBatchesResponse extends createZodDto(
  TaskBatchesResponseSchema,
) {}

export const TaskHistoryResponseSchema = TaskHistoryResponse200Schema;
export class TaskHistoryResponse extends createZodDto(
  TaskHistoryResponseSchema,
) {}

export const TaskStatusSummaryResponseSchema =
  TaskStatusSummaryResponse200Schema;
export class TaskStatusSummaryResponse extends createZodDto(
  TaskStatusSummaryResponseSchema,
) {}

// GET /task (list with typed filters)
export const TaskListQuerySchema = PaginationQuerySchema.extend({
  status: enumArrayQueryParam(TaskStatusSchema),
  kind: enumArrayQueryParam(TaskKindSchema),
});
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;
export class TaskListQueryDto extends createZodDto(TaskListQuerySchema) {}
