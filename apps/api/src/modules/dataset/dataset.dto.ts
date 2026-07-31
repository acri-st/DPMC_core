import {
  CreateDatasetBodySchema,
  CreateDatasetResponse200Schema,
  GetDatasetResponse200Schema,
  ListDatasetResponse200Schema,
  UpdateDatasetBodySchema,
  UpdateDatasetResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from '@/common/utils/pagination';

export const DatasetListQuerySchema = PaginationQuerySchema.extend({
  producedByBatchId: z.coerce.number().int().optional(),
  name: z.string().trim().optional(),
  origin: z.enum(['batch', 'manual', 'user', 'system', 'all']).optional(),
});
export class DatasetListQueryDto extends createZodDto(DatasetListQuerySchema) {}

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
