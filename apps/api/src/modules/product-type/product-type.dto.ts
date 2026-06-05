import {
  CreateProductTypeBodySchema,
  CreateProductTypeResponse201Schema,
  DeleteProductTypeResponse204Schema,
  GetProductTypeResponse200Schema,
  ListProductTypeResponse200Schema,
  UpdateProductTypeBodySchema,
  UpdateProductTypeResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListProductTypeResponseSchema = ListProductTypeResponse200Schema;
export class ListProductTypeResponse extends createZodDto(
  ListProductTypeResponseSchema,
) {}

export const GetProductTypeResponseSchema = GetProductTypeResponse200Schema;
export class GetProductTypeResponse extends createZodDto(
  GetProductTypeResponseSchema,
) {}

export class CreateProductTypeBody extends createZodDto(
  CreateProductTypeBodySchema,
) {}
export const CreateProductTypeResponseSchema =
  CreateProductTypeResponse201Schema;
export class CreateProductTypeResponse extends createZodDto(
  CreateProductTypeResponseSchema,
) {}

export class UpdateProductTypeBody extends createZodDto(
  UpdateProductTypeBodySchema,
) {}
export const UpdateProductTypeResponseSchema =
  UpdateProductTypeResponse200Schema;
export class UpdateProductTypeResponse extends createZodDto(
  UpdateProductTypeResponseSchema,
) {}

export const DeleteProductTypeResponseSchema =
  DeleteProductTypeResponse204Schema;
export class DeleteProductTypeResponse extends createZodDto(
  DeleteProductTypeResponseSchema,
) {}
