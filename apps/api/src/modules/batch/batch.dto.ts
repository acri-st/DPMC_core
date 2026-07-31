import {
  BatchKindSchema,
  BatchStatusSchema,
  CreateBatchRequest,
  CreateBatchRequestSchema,
  CreateBatchResponse201Schema,
  GetBatchResponse200Schema,
  ListBatchInputsResponse200Schema,
  ListBatchJobsResponse200Schema,
  ListBatchLogsQuerySchema,
  ListBatchLogsResponse200Schema,
  ListBatchProductsResponse200Schema,
  ListBatchResponse200Schema,
  ReplayBatchResponse201Schema,
  BatchStatusSummaryResponse200Schema,
  UpdateBatchPriorityBodySchema,
  UpdateBatchPriorityResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  enumArrayQueryParam,
} from '@/common/utils/pagination';

// GET /batch
export const ListBatchResponseSchema = ListBatchResponse200Schema;
export class ListBatchResponse extends createZodDto(ListBatchResponseSchema) {}

// GET /batch/:id
export const GetBatchResponseSchema = GetBatchResponse200Schema;
export class GetBatchResponse extends createZodDto(GetBatchResponseSchema) {}

// GET /batch/:id/jobs
export const ListBatchJobsResponseSchema = ListBatchJobsResponse200Schema;
export class ListBatchJobsResponse extends createZodDto(
  ListBatchJobsResponseSchema,
) {}

// GET /batch/:id/products
export const ListBatchProductsResponseSchema =
  ListBatchProductsResponse200Schema;
export class ListBatchProductsResponse extends createZodDto(
  ListBatchProductsResponseSchema,
) {}

// GET /batch/:id/inputs
export const ListBatchInputsResponseSchema = ListBatchInputsResponse200Schema;
export class ListBatchInputsResponse extends createZodDto(
  ListBatchInputsResponseSchema,
) {}

// GET /batch/:id/logs
export class ListBatchLogsQueryDto extends createZodDto(
  ListBatchLogsQuerySchema,
) {}
export const ListBatchLogsResponseSchema = ListBatchLogsResponse200Schema;
export class ListBatchLogsResponse extends createZodDto(
  ListBatchLogsResponseSchema,
) {}

// POST /batch — discriminated union, validated via ZodValidationPipe in the controller.
export const CreateBatchBodySchema = CreateBatchRequestSchema;
export type CreateBatchBody = CreateBatchRequest;

export const CreateBatchResponseSchema = CreateBatchResponse201Schema;
export class CreateBatchResponse extends createZodDto(
  CreateBatchResponseSchema,
) {}

// POST /batch/:id/replay
export const ReplayBatchResponseSchema = ReplayBatchResponse201Schema;
export class ReplayBatchResponse extends createZodDto(
  ReplayBatchResponseSchema,
) {}

// PATCH /batch/:id/priority
export class UpdateBatchPriorityBody extends createZodDto(
  UpdateBatchPriorityBodySchema,
) {}
export const UpdateBatchPriorityResponseSchema =
  UpdateBatchPriorityResponse200Schema;
export class UpdateBatchPriorityResponse extends createZodDto(
  UpdateBatchPriorityResponseSchema,
) {}

// GET /batch/status-summary
export const BatchStatusSummaryResponseSchema =
  BatchStatusSummaryResponse200Schema;
export class BatchStatusSummaryResponse extends createZodDto(
  BatchStatusSummaryResponseSchema,
) {}

// GET /batch (list with typed filters)
export const BatchListQuerySchema = PaginationQuerySchema.extend({
  status: enumArrayQueryParam(BatchStatusSchema),
  kind: enumArrayQueryParam(BatchKindSchema),
});
export type BatchListQuery = z.infer<typeof BatchListQuerySchema>;
export class BatchListQueryDto extends createZodDto(BatchListQuerySchema) {}
