import {
  CreateDatasetBodySchema,
  CreateDatasetResponse200Schema,
  GetDatasetResponse200Schema,
  ListDatasetResponse200Schema,
  UpdateDatasetBodySchema,
  UpdateDatasetResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export class ListDatasetResponse extends createZodDto(
  ListDatasetResponse200Schema,
) {}
export class GetDatasetResponse extends createZodDto(
  GetDatasetResponse200Schema,
) {}
export class CreateDatasetBody extends createZodDto(CreateDatasetBodySchema) {}
export class CreateDatasetResponse extends createZodDto(
  CreateDatasetResponse200Schema,
) {}
export class UpdateDatasetBody extends createZodDto(UpdateDatasetBodySchema) {}
export class UpdateDatasetResponse extends createZodDto(
  UpdateDatasetResponse200Schema,
) {}
