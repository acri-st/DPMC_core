import { PrismaService } from '@/core/prisma';
import {
  AddEdgeRequest,
  DependencyMode,
  ProductionChainEdge,
  UpdateEdgeRequest,
} from '@dpmc/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class EdgesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    chainId: number,
    dto: AddEdgeRequest,
  ): Promise<ProductionChainEdge> {
    if (dto.parentChainId === dto.childChainId) {
      throw new BadRequestException('Self-edges are not allowed.');
    }
    await this.assertChainsExistInChain(chainId, [
      dto.parentChainId,
      dto.childChainId,
    ]);
    await this.assertNoCycle(chainId, dto.parentChainId, dto.childChainId);
    try {
      const created = await this.prisma.productionChainEdge.create({
        data: {
          productionChainId: chainId,
          parentChainId: dto.parentChainId,
          childChainId: dto.childChainId,
          dependencyMode: dto.dependencyMode,
          isFanOut: dto.isFanOut,
        },
      });
      return this.toDto(created);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'An edge between these chains already exists.',
        );
      }
      throw err;
    }
  }

  async update(
    chainId: number,
    edgeId: number,
    dto: UpdateEdgeRequest,
  ): Promise<ProductionChainEdge> {
    await this.assertEdgeBelongsToChain(chainId, edgeId);
    const updated = await this.prisma.productionChainEdge.update({
      where: { id: edgeId },
      data: {
        dependencyMode: dto.dependencyMode,
        isFanOut: dto.isFanOut,
      },
    });
    return this.toDto(updated);
  }

  async delete(chainId: number, edgeId: number): Promise<void> {
    await this.assertEdgeBelongsToChain(chainId, edgeId);
    await this.prisma.productionChainEdge.delete({ where: { id: edgeId } });
  }

  private toDto(edge: {
    id: number;
    productionChainId: number;
    parentChainId: number;
    childChainId: number;
    dependencyMode: DependencyMode;
    isFanOut: boolean;
  }): ProductionChainEdge {
    return {
      id: edge.id,
      productionChainId: edge.productionChainId,
      parentChainId: edge.parentChainId,
      childChainId: edge.childChainId,
      dependencyMode: edge.dependencyMode,
      isFanOut: edge.isFanOut,
    };
  }

  private async assertChainsExistInChain(
    chainId: number,
    pcIds: number[],
  ): Promise<void> {
    const found = await this.prisma.processingChain.findMany({
      where: { productionChainId: chainId, id: { in: pcIds } },
      select: { id: true },
    });
    if (found.length !== pcIds.length) {
      throw new NotFoundException(
        `One or more ProcessingChains not found in chain ${chainId}.`,
      );
    }
  }

  private async assertEdgeBelongsToChain(
    chainId: number,
    edgeId: number,
  ): Promise<void> {
    const edge = await this.prisma.productionChainEdge.findUnique({
      where: { id: edgeId },
      select: { productionChainId: true },
    });
    if (!edge || edge.productionChainId !== chainId) {
      throw new NotFoundException(
        `Edge ${edgeId} not found in chain ${chainId}.`,
      );
    }
  }

  private async assertNoCycle(
    chainId: number,
    parentId: number,
    childId: number,
  ): Promise<void> {
    const edges = await this.prisma.productionChainEdge.findMany({
      where: { productionChainId: chainId },
      select: { parentChainId: true, childChainId: true },
    });
    const adj = new Map<number, number[]>();
    for (const e of edges) {
      const arr = adj.get(e.parentChainId) ?? [];
      arr.push(e.childChainId);
      adj.set(e.parentChainId, arr);
    }
    const visited = new Set<number>();
    const queue = [childId];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node === parentId) {
        throw new BadRequestException(
          `Adding edge ${parentId} -> ${childId} would create a cycle.`,
        );
      }
      if (visited.has(node)) continue;
      visited.add(node);
      for (const next of adj.get(node) ?? []) queue.push(next);
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
