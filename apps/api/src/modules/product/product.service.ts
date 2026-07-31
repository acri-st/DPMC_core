import { PrismaService } from '@/core/prisma';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  PaginationQuery,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import type { CreateProductBody, UpdateProductBody } from './product.dto';
import { productToDto } from './product.utils';

// Columns the product list may be sorted by (real Product scalar fields only —
// derived values like the product type acronym / processing level live on the
// related ProductType and can't be ordered in the DB here).
const PRODUCT_SORTABLE = [
  'name',
  'version',
  'productTypeId',
  'isDefault',
  'generatedAt',
  'createdAt',
  'id',
] as const;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async list(pagination?: PaginationQuery): Promise<PaginatedResult<Product>> {
    const p = pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['name', 'version'], p.q);
    const where = search ?? undefined;
    // Default: name asc (id desc breaks ties for stable pagination);
    // overridable via ?sort=&order= against the PRODUCT_SORTABLE allowlist.
    const orderBy = buildOrderBy(PRODUCT_SORTABLE, p.sort, p.order, [
      { name: 'asc' },
      { id: 'desc' },
    ]);
    const [records, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: records.map(productToDto), total };
  }

  async getById(id: number): Promise<Product> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return productToDto(record);
  }

  async create(dto: CreateProductBody): Promise<Product> {
    await this.assertProductTypeExists(dto.productTypeId);
    const created = await this.prisma.product.create({
      data: {
        productTypeId: dto.productTypeId,
        parentBatchId: dto.parentBatchId ?? null,
        name: dto.name,
        version: dto.version ?? '',
        isDefault: dto.isDefault ?? false,
        generatedAt: dto.generatedAt ?? null,
        parameters:
          dto.parameters === undefined || dto.parameters === null
            ? Prisma.JsonNull
            : (dto.parameters as Prisma.InputJsonValue),
        comment: dto.comment ?? null,
      },
    });
    return productToDto(created);
  }

  async update(id: number, dto: UpdateProductBody): Promise<Product> {
    await this.getById(id);
    if (dto.productTypeId) {
      await this.assertProductTypeExists(dto.productTypeId);
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productTypeId: dto.productTypeId,
        name: dto.name,
        version: dto.version,
        isDefault: dto.isDefault,
        generatedAt: dto.generatedAt,
        parameters:
          dto.parameters === undefined
            ? undefined
            : dto.parameters === null
              ? Prisma.JsonNull
              : (dto.parameters as Prisma.InputJsonValue),
        comment: dto.comment,
      },
    });
    return productToDto(updated);
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.product.delete({ where: { id } });
  }

  private async assertProductTypeExists(productTypeId: number): Promise<void> {
    const exists = await this.prisma.productType.findUnique({
      where: { id: productTypeId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`ProductType ${productTypeId} not found`);
    }
  }
}
