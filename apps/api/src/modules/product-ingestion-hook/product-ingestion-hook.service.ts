import { PrismaService } from '@/core/prisma';
import { isUniqueViolation } from '@/common/utils';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProductIngestionHook } from '@dpmc/client';
import { PaginatedResult, paginationSkipTake } from '@/common/utils/pagination';
import type {
  CreateProductIngestionHookBody,
  ProductIngestionHookListQuery,
  UpdateProductIngestionHookBody,
} from './product-ingestion-hook.dto';
import { productIngestionHookToDto } from './product-ingestion-hook.utils';

@Injectable()
export class ProductIngestionHookService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ProductIngestionHookListQuery,
  ): Promise<PaginatedResult<ProductIngestionHook>> {
    const { skip, take } = paginationSkipTake(query);
    const where = {
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.productIngestionHook.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productIngestionHook.count({ where }),
    ]);
    return { items: records.map(productIngestionHookToDto), total };
  }

  async getById(id: number): Promise<ProductIngestionHook> {
    const record = await this.prisma.productIngestionHook.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`ProductIngestionHook ${id} not found`);
    }
    return productIngestionHookToDto(record);
  }

  async create(
    dto: CreateProductIngestionHookBody,
  ): Promise<ProductIngestionHook> {
    const productType = await this.prisma.productType.findUnique({
      where: { id: dto.productTypeId },
      select: { id: true },
    });
    if (!productType) {
      throw new NotFoundException(`ProductType ${dto.productTypeId} not found`);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    if (dto.productionChainId) {
      const productionChain = await this.prisma.productionChain.findUnique({
        where: { id: dto.productionChainId },
        select: { id: true },
      });
      if (!productionChain) {
        throw new NotFoundException(
          `ProductionChain ${dto.productionChainId} not found`,
        );
      }
    }

    try {
      const created = await this.prisma.productIngestionHook.create({
        data: {
          productTypeId: dto.productTypeId,
          productionChainId: dto.productionChainId ?? null,
          projectId: dto.projectId,
          productionMode: dto.productionMode ?? 'Reprocessing',
          enabled: dto.enabled ?? true,
        },
      });
      return productIngestionHookToDto(created);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `ProductIngestionHook with productTypeId "${dto.productTypeId}" and productionChainId "${dto.productionChainId}" already exists.`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateProductIngestionHookBody,
  ): Promise<ProductIngestionHook> {
    await this.getById(id);

    if (dto.productionChainId) {
      const productionChain = await this.prisma.productionChain.findUnique({
        where: { id: dto.productionChainId },
        select: { id: true },
      });
      if (!productionChain) {
        throw new NotFoundException(
          `ProductionChain ${dto.productionChainId} not found`,
        );
      }
    }

    const updated = await this.prisma.productIngestionHook.update({
      where: { id },
      data: {
        enabled: dto.enabled,
        productionChainId: dto.productionChainId,
        productionMode: dto.productionMode,
      },
    });
    return productIngestionHookToDto(updated);
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.productIngestionHook.delete({
      where: { id },
    });
  }
}
