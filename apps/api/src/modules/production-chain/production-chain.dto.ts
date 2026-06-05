import {
  CreateProductionChainRequestSchema,
  CreateProductionChainResponse201Schema,
  DeleteProductionChainResponse204Schema,
  GetProductionChainResponse200Schema,
  ImportProductionChainBodySchema,
  ImportProductionChainResponse201Schema,
  LinkProductTypeResponse200Schema,
  ListCompatibleProductsResponse200Schema,
  ListProductionChainResponse200Schema,
  PreviewProductionChainResponse200Schema,
  ProductionChainKindSchema,
  UnlinkProductTypeResponse204Schema,
  UpdateProductionChainRequestSchema,
  UpdateProductionChainResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  optionalBoolean,
} from '@/common/utils/pagination';

// GET /production-chain typed filters
export const ProductionChainListQuerySchema = PaginationQuerySchema.extend({
  kind: ProductionChainKindSchema.optional(),
  isActive: optionalBoolean(),
});
export type ProductionChainListQuery = z.infer<
  typeof ProductionChainListQuerySchema
>;
export class ProductionChainListQueryDto extends createZodDto(
  ProductionChainListQuerySchema,
) {}

// GET /production-chain
export const ListProductionChainResponseSchema =
  ListProductionChainResponse200Schema;
export class ListProductionChainResponse extends createZodDto(
  ListProductionChainResponseSchema,
) {}

// GET /production-chain/:id
export const GetProductionChainResponseSchema =
  GetProductionChainResponse200Schema;
export class GetProductionChainResponse extends createZodDto(
  GetProductionChainResponseSchema,
) {}

// POST /production-chain
export const CreateProductionChainBodySchema =
  CreateProductionChainRequestSchema;
export class CreateProductionChainBody extends createZodDto(
  CreateProductionChainBodySchema,
) {}
export const CreateProductionChainResponseSchema =
  CreateProductionChainResponse201Schema;
export class CreateProductionChainResponse extends createZodDto(
  CreateProductionChainResponseSchema,
) {}

// PATCH /production-chain/:id
export const UpdateProductionChainBodySchema =
  UpdateProductionChainRequestSchema;
export class UpdateProductionChainBody extends createZodDto(
  UpdateProductionChainBodySchema,
) {}
export const UpdateProductionChainResponseSchema =
  UpdateProductionChainResponse200Schema;
export class UpdateProductionChainResponse extends createZodDto(
  UpdateProductionChainResponseSchema,
) {}

// DELETE /production-chain/:id
export const DeleteProductionChainResponseSchema =
  DeleteProductionChainResponse204Schema;
export class DeleteProductionChainResponse extends createZodDto(
  DeleteProductionChainResponseSchema,
) {}

// POST /production-chain/:id/product-types/:productTypeId
export const LinkProductTypeResponseSchema = LinkProductTypeResponse200Schema;
export class LinkProductTypeResponse extends createZodDto(
  LinkProductTypeResponseSchema,
) {}

// DELETE /production-chain/:id/product-types/:productTypeId
export const UnlinkProductTypeResponseSchema =
  UnlinkProductTypeResponse204Schema;
export class UnlinkProductTypeResponse extends createZodDto(
  UnlinkProductTypeResponseSchema,
) {}

// GET /production-chain/:id/compatible-products
export const ListCompatibleProductsResponseSchema =
  ListCompatibleProductsResponse200Schema;
export class ListCompatibleProductsResponse extends createZodDto(
  ListCompatibleProductsResponseSchema,
) {}

// POST /production-chain/import
export const ImportProductionChainBodyValidationSchema =
  ImportProductionChainBodySchema;
export class ImportProductionChainBody extends createZodDto(
  ImportProductionChainBodyValidationSchema,
) {}
export const ImportProductionChainResponseSchema =
  ImportProductionChainResponse201Schema;
export class ImportProductionChainResponse extends createZodDto(
  ImportProductionChainResponseSchema,
) {}

// POST /production-chain/import/preview
export const PreviewProductionChainResponseSchema =
  PreviewProductionChainResponse200Schema;
export class PreviewProductionChainResponse extends createZodDto(
  PreviewProductionChainResponseSchema,
) {}
