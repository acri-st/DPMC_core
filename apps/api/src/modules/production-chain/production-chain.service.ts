import { PrismaService } from '@/core/prisma';
import {
  CreateProductionChainRequest,
  ProductionChain,
  ProductionChainGraph,
  type Product,
  UpdateProductionChainRequest,
} from '@dpmc/client';
import { productToDto } from '@/modules/product/product.utils';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@dpmc/prisma';
import {
  PaginatedResult,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { ProductionChainListQuery } from './production-chain.dto';

@Injectable()
export class ProductionChainService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    projectId: number,
    query: ProductionChainListQuery,
  ): Promise<PaginatedResult<ProductionChain>> {
    const { skip, take } = paginationSkipTake(query);
    const search = buildSearchWhere(['name', 'comment'], query.q);
    const where = {
      projectId,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search ?? {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.productionChain.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.productionChain.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number, projectId: number): Promise<ProductionChainGraph> {
    const chain = await this.prisma.productionChain.findFirst({
      where: { id, projectId },
      include: {
        processingChains: true,
        edges: true,
      },
    });
    if (!chain) {
      throw new NotFoundException(`ProductionChain ${id} not found`);
    }

    // TODO: @dpmc/client ProductionChainGraph still references latestVersion —
    // casting to any until the client type is updated in a subsequent task.
    return {
      id: chain.id,
      projectId: chain.projectId,
      name: chain.name,
      comment: chain.comment,
      isActive: chain.isActive,
      kind: chain.kind,
      watcherConfig: chain.watcherConfig,
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
      configuration: chain.configuration,
      processingChains: chain.processingChains.map((pc) => ({
        id: pc.id,
        name: pc.name,
        comment: pc.comment,
        processingScriptId: pc.processingScriptId,
        configuration: pc.configuration,
      })),
      edges: chain.edges.map((e) => ({
        id: e.id,
        productionChainId: e.productionChainId,
        parentChainId: e.parentChainId,
        childChainId: e.childChainId,
        dependencyMode: e.dependencyMode,
        isFanOut: e.isFanOut,
      })),
    };
  }

  async listCompatibleProducts(
    id: number,
    projectId: number,
  ): Promise<Product[]> {
    const chain = await this.prisma.productionChain.findFirst({
      where: { id, projectId },
      select: {
        id: true,
        productTypes: { select: { productTypeId: true } },
      },
    });
    if (!chain) {
      throw new NotFoundException(`ProductionChain ${id} not found`);
    }
    const typeIds = chain.productTypes.map((pt) => pt.productTypeId);
    const products = await this.prisma.product.findMany({
      where: typeIds.length > 0 ? { productTypeId: { in: typeIds } } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return products.map(productToDto);
  }

  async create(
    dto: CreateProductionChainRequest,
    projectId: number,
  ): Promise<ProductionChain> {
    try {
      return await this.prisma.productionChain.create({
        data: {
          projectId,
          name: dto.name,
          comment: dto.comment ?? null,
          kind: dto.kind ?? undefined,
          configuration:
            dto.configuration === undefined
              ? undefined
              : dto.configuration === null
                ? Prisma.JsonNull
                : (dto.configuration as Prisma.InputJsonValue),
          watcherConfig:
            dto.watcherConfig === undefined
              ? undefined
              : dto.watcherConfig === null
                ? Prisma.JsonNull
                : (dto.watcherConfig as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `ProductionChain "${dto.name}" already exists in this project.`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    projectId: number,
    dto: UpdateProductionChainRequest,
  ): Promise<ProductionChain> {
    await this.assertChainExists(id, projectId);
    try {
      return await this.prisma.productionChain.update({
        where: { id },
        data: {
          name: dto.name,
          comment: dto.comment,
          kind: dto.kind ?? undefined,
          configuration:
            dto.configuration === undefined
              ? undefined
              : dto.configuration === null
                ? Prisma.JsonNull
                : (dto.configuration as Prisma.InputJsonValue),
          watcherConfig:
            dto.watcherConfig === undefined
              ? undefined
              : dto.watcherConfig === null
                ? Prisma.JsonNull
                : (dto.watcherConfig as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `ProductionChain "${dto.name}" already exists in this project.`,
        );
      }
      throw err;
    }
  }

  async delete(id: number, projectId: number): Promise<void> {
    const chain = await this.prisma.productionChain.findFirst({
      where: { id, projectId },
      select: {
        id: true,
        _count: { select: { batches: true } },
      },
    });
    if (!chain) {
      throw new NotFoundException(`ProductionChain ${id} not found`);
    }
    if (chain._count.batches > 0) {
      throw new ConflictException(
        `ProductionChain ${id} cannot be deleted because ${chain._count.batches} batch(es) reference it.`,
      );
    }
    await this.prisma.productionChain.delete({ where: { id } });
  }

  async linkProductType(
    chainId: number,
    productTypeId: number,
    projectId: number,
  ): Promise<ProductionChain> {
    await this.assertChainExists(chainId, projectId);
    const productType = await this.prisma.productType.findUnique({
      where: { id: productTypeId },
      select: { id: true },
    });
    if (!productType) {
      throw new NotFoundException(`ProductType ${productTypeId} not found`);
    }
    await this.prisma.productionChainProductType.upsert({
      where: {
        productionChainId_productTypeId: {
          productionChainId: chainId,
          productTypeId,
        },
      },
      create: { productionChainId: chainId, productTypeId },
      update: {},
    });
    return this.prisma.productionChain.findUniqueOrThrow({
      where: { id: chainId },
    });
  }

  async unlinkProductType(
    chainId: number,
    productTypeId: number,
    projectId: number,
  ): Promise<void> {
    await this.assertChainExists(chainId, projectId);
    const link = await this.prisma.productionChainProductType.findUnique({
      where: {
        productionChainId_productTypeId: {
          productionChainId: chainId,
          productTypeId,
        },
      },
    });
    if (!link) {
      throw new NotFoundException(
        `ProductType ${productTypeId} is not linked to ProductionChain ${chainId}`,
      );
    }
    await this.prisma.productionChainProductType.delete({
      where: {
        productionChainId_productTypeId: {
          productionChainId: chainId,
          productTypeId,
        },
      },
    });
  }

  async assertChainExists(id: number, projectId: number): Promise<void> {
    const exists = await this.prisma.productionChain.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`ProductionChain ${id} not found`);
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === 'P2002'
    );
  }
}
