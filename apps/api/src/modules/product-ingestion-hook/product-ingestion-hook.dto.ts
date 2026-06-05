import {
  CreateProductIngestionHookBodySchema,
  CreateProductIngestionHookResponse201Schema,
  DeleteProductIngestionHookResponse204Schema,
  GetProductIngestionHookResponse200Schema,
  ListProductIngestionHookResponse200Schema,
  UpdateProductIngestionHookBodySchema,
  UpdateProductIngestionHookResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  optionalBoolean,
} from '@/common/utils/pagination';

export const ProductIngestionHookListQuerySchema = PaginationQuerySchema.extend(
  {
    enabled: optionalBoolean(),
    productTypeId: z.coerce.number().int().positive().optional(),
    projectId: z.coerce.number().int().positive().optional(),
  },
);
export type ProductIngestionHookListQuery = z.infer<
  typeof ProductIngestionHookListQuerySchema
>;
export class ProductIngestionHookListQueryDto extends createZodDto(
  ProductIngestionHookListQuerySchema,
) {}

export const ListProductIngestionHookResponseSchema =
  ListProductIngestionHookResponse200Schema;
export class ListProductIngestionHookResponse extends createZodDto(
  ListProductIngestionHookResponseSchema,
) {}

export const GetProductIngestionHookResponseSchema =
  GetProductIngestionHookResponse200Schema;
export class GetProductIngestionHookResponse extends createZodDto(
  GetProductIngestionHookResponseSchema,
) {}

export class CreateProductIngestionHookBody extends createZodDto(
  CreateProductIngestionHookBodySchema,
) {}
export const CreateProductIngestionHookResponseSchema =
  CreateProductIngestionHookResponse201Schema;
export class CreateProductIngestionHookResponse extends createZodDto(
  CreateProductIngestionHookResponseSchema,
) {}

export class UpdateProductIngestionHookBody extends createZodDto(
  UpdateProductIngestionHookBodySchema,
) {}
export const UpdateProductIngestionHookResponseSchema =
  UpdateProductIngestionHookResponse200Schema;
export class UpdateProductIngestionHookResponse extends createZodDto(
  UpdateProductIngestionHookResponseSchema,
) {}

export const DeleteProductIngestionHookResponseSchema =
  DeleteProductIngestionHookResponse204Schema;
export class DeleteProductIngestionHookResponse extends createZodDto(
  DeleteProductIngestionHookResponseSchema,
) {}
