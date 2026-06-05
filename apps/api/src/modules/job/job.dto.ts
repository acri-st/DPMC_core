import {
  CancelJobResponse200Schema,
  GetJobResponse200Schema,
  JobStatusSchema,
  ListJobResponse200Schema,
  PauseJobResponse200Schema,
  ResumeJobResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from '@/common/utils/pagination';

// GET /job
export const ListJobResponseSchema = ListJobResponse200Schema;
export class ListJobResponse extends createZodDto(ListJobResponseSchema) {}

// GET /job/:id
export const GetJobResponseSchema = GetJobResponse200Schema;
export class GetJobResponse extends createZodDto(GetJobResponseSchema) {}

// POST /job/:id/cancel
export const CancelJobResponseSchema = CancelJobResponse200Schema;
export class CancelJobResponse extends createZodDto(CancelJobResponseSchema) {}

// POST /job/:id/pause
export const PauseJobResponseSchema = PauseJobResponse200Schema;
export class PauseJobResponse extends createZodDto(PauseJobResponseSchema) {}

// POST /job/:id/resume
export const ResumeJobResponseSchema = ResumeJobResponse200Schema;
export class ResumeJobResponse extends createZodDto(ResumeJobResponseSchema) {}

// GET /job (list with typed filters)
export const JobListQuerySchema = PaginationQuerySchema.extend({
  status: JobStatusSchema.optional(),
});
export type JobListQuery = z.infer<typeof JobListQuerySchema>;
export class JobListQueryDto extends createZodDto(JobListQuerySchema) {}
