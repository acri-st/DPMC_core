import { PrismaService } from '@/core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddProcessingChainBody,
  ProcessingChainNode,
  UpdateProcessingChainBody,
} from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import { processingChainToDto } from './processing-chains.utils';

@Injectable()
export class ProcessingChainsService {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    chainId: number,
    dto: AddProcessingChainBody,
  ): Promise<ProcessingChainNode> {
    const chainExists = await this.prisma.productionChain.findFirst({
      where: { id: chainId, deletedAt: null },
      select: { id: true },
    });
    if (!chainExists) {
      throw new NotFoundException(`ProductionChain ${chainId} not found`);
    }
    const script = await this.prisma.processingScript.findFirst({
      where: { id: dto.processingScriptId, deletedAt: null },
      select: { id: true },
    });
    if (!script) {
      throw new NotFoundException(
        `ProcessingScript ${dto.processingScriptId} not found`,
      );
    }
    const created = await this.prisma.processingChain.create({
      data: {
        productionChainId: chainId,
        processingScriptId: dto.processingScriptId,
        name: dto.name,
        comment: dto.comment ?? null,
        configuration:
          dto.configuration === undefined || dto.configuration === null
            ? Prisma.JsonNull
            : (dto.configuration as Prisma.InputJsonValue),
      },
    });
    return processingChainToDto(created);
  }

  async update(
    chainId: number,
    pcId: number,
    dto: UpdateProcessingChainBody,
  ): Promise<ProcessingChainNode> {
    await this.assertProcessingChainBelongsToChain(chainId, pcId);
    const updated = await this.prisma.processingChain.update({
      where: { id: pcId },
      data: {
        name: dto.name,
        comment: dto.comment,
        configuration:
          dto.configuration === undefined
            ? undefined
            : dto.configuration === null
              ? Prisma.JsonNull
              : (dto.configuration as Prisma.InputJsonValue),
      },
    });
    return processingChainToDto(updated);
  }

  async delete(chainId: number, pcId: number): Promise<void> {
    await this.assertProcessingChainBelongsToChain(chainId, pcId);
    await this.prisma.processingChain.delete({ where: { id: pcId } });
  }

  private async assertProcessingChainBelongsToChain(
    chainId: number,
    pcId: number,
  ): Promise<void> {
    const pc = await this.prisma.processingChain.findUnique({
      where: { id: pcId },
      select: { productionChainId: true },
    });
    if (!pc || pc.productionChainId !== chainId) {
      throw new NotFoundException(
        `ProcessingChain ${pcId} not found in chain ${chainId}`,
      );
    }
  }
}
