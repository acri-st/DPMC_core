import {
  BatchInputsResponse200Schema,
  JobOutputsBodySchema,
  JobOutputsResponse200Schema,
  JobResultBodySchema,
  JobResultResponse200Schema,
  NextJobResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const NextJobResponseSchema = NextJobResponse200Schema;
export class NextJobResponse extends createZodDto(NextJobResponseSchema) {}

export class JobResultBody extends createZodDto(JobResultBodySchema) {}
export const JobResultResponseSchema = JobResultResponse200Schema;
export class JobResultResponse extends createZodDto(JobResultResponseSchema) {}

export class JobOutputsBody extends createZodDto(JobOutputsBodySchema) {}
export const JobOutputsResponseSchema = JobOutputsResponse200Schema;
export class JobOutputsResponse extends createZodDto(
  JobOutputsResponseSchema,
) {}

export const BatchInputsResponseSchema = BatchInputsResponse200Schema;
export class BatchInputsResponse extends createZodDto(
  BatchInputsResponseSchema,
) {}
