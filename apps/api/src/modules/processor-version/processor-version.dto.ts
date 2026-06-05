import {
  CreateProcessorVersionBodySchema,
  CreateProcessorVersionResponse201Schema,
  DeleteProcessorVersionResponse204Schema,
  GetProcessorVersionResponse200Schema,
  ListProcessorVersionResponse200Schema,
  UpdateProcessorVersionBodySchema,
  UpdateProcessorVersionResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListProcessorVersionResponseSchema =
  ListProcessorVersionResponse200Schema;
export class ListProcessorVersionResponse extends createZodDto(
  ListProcessorVersionResponseSchema,
) {}

export const GetProcessorVersionResponseSchema =
  GetProcessorVersionResponse200Schema;
export class GetProcessorVersionResponse extends createZodDto(
  GetProcessorVersionResponseSchema,
) {}

export class CreateProcessorVersionBody extends createZodDto(
  CreateProcessorVersionBodySchema,
) {}
export const CreateProcessorVersionResponseSchema =
  CreateProcessorVersionResponse201Schema;
export class CreateProcessorVersionResponse extends createZodDto(
  CreateProcessorVersionResponseSchema,
) {}

export class UpdateProcessorVersionBody extends createZodDto(
  UpdateProcessorVersionBodySchema,
) {}
export const UpdateProcessorVersionResponseSchema =
  UpdateProcessorVersionResponse200Schema;
export class UpdateProcessorVersionResponse extends createZodDto(
  UpdateProcessorVersionResponseSchema,
) {}

export const DeleteProcessorVersionResponseSchema =
  DeleteProcessorVersionResponse204Schema;
export class DeleteProcessorVersionResponse extends createZodDto(
  DeleteProcessorVersionResponseSchema,
) {}
