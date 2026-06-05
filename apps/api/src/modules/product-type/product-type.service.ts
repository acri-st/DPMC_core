import { PrismaService } from '@/core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProductType } from '@dpmc/client';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type {
  CreateProductTypeBody,
  UpdateProductTypeBody,
} from './product-type.dto';

@Injectable()
export class ProductTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<ProductType>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['acronym', 'name'], pagination.q);
    const where = search ?? undefined;
    const [records, total] = await Promise.all([
      this.prisma.productType.findMany({
        where,
        skip,
        take,
        orderBy: { acronym: 'asc' },
      }),
      this.prisma.productType.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number): Promise<ProductType> {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
    });
    if (!productType) {
      throw new NotFoundException(`ProductType ${id} not found`);
    }
    return productType;
  }

  async create(dto: CreateProductTypeBody): Promise<ProductType> {
    return this.prisma.productType.create({
      data: {
        acronym: dto.acronym,
        name: dto.name,
        processingLevel: dto.processingLevel ?? undefined,
      },
    });
  }

  async update(id: number, dto: UpdateProductTypeBody): Promise<ProductType> {
    await this.getById(id);
    return this.prisma.productType.update({
      where: { id },
      data: {
        acronym: dto.acronym,
        name: dto.name,
        processingLevel: dto.processingLevel ?? undefined,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.productType.delete({ where: { id } });
  }
}
