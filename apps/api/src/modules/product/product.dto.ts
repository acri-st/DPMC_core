import {
  CreateProductBodySchema,
  CreateProductResponse201Schema,
  DeleteProductResponse204Schema,
  GetProductResponse200Schema,
  ListProductResponse200Schema,
  UpdateProductBodySchema,
  UpdateProductResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListProductResponseSchema = ListProductResponse200Schema;
export class ListProductResponse extends createZodDto(
  ListProductResponseSchema,
) {}

export const GetProductResponseSchema = GetProductResponse200Schema;
export class GetProductResponse extends createZodDto(
  GetProductResponseSchema,
) {}

export class CreateProductBody extends createZodDto(CreateProductBodySchema) {}
export const CreateProductResponseSchema = CreateProductResponse201Schema;
export class CreateProductResponse extends createZodDto(
  CreateProductResponseSchema,
) {}

export class UpdateProductBody extends createZodDto(UpdateProductBodySchema) {}
export const UpdateProductResponseSchema = UpdateProductResponse200Schema;
export class UpdateProductResponse extends createZodDto(
  UpdateProductResponseSchema,
) {}

export const DeleteProductResponseSchema = DeleteProductResponse204Schema;
export class DeleteProductResponse extends createZodDto(
  DeleteProductResponseSchema,
) {}
