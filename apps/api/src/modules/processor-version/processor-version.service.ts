import { PrismaService } from '@/core/prisma';
import { isUniqueViolation } from '@/common/utils';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProcessorVersion } from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type {
  CreateProcessorVersionBody,
  UpdateProcessorVersionBody,
} from './processor-version.dto';
import { processorVersionToDto } from './processor-version.utils';

@Injectable()
export class ProcessorVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<ProcessorVersion>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['baseline'], pagination.q);
    const where = search ?? undefined;
    const [records, total] = await Promise.all([
      this.prisma.processorVersion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.processorVersion.count({ where }),
    ]);
    return { items: records.map(processorVersionToDto), total };
  }

  async getById(id: number): Promise<ProcessorVersion> {
    const record = await this.prisma.processorVersion.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`ProcessorVersion ${id} not found`);
    }
    return processorVersionToDto(record);
  }

  async create(dto: CreateProcessorVersionBody): Promise<ProcessorVersion> {
    const psv = await this.prisma.processingScriptVersion.findUnique({
      where: { id: dto.processingScriptVersionId },
      select: { id: true },
    });
    if (!psv) {
      throw new NotFoundException(
        `ProcessingScriptVersion ${dto.processingScriptVersionId} not found`,
      );
    }
    const aux = await this.prisma.auxiliaryConfiguration.findFirst({
      where: { id: dto.auxiliaryConfigurationId, deletedAt: null },
      select: { id: true },
    });
    if (!aux) {
      throw new NotFoundException(
        `AuxiliaryConfiguration ${dto.auxiliaryConfigurationId} not found`,
      );
    }

    try {
      const created = await this.prisma.processorVersion.create({
        data: {
          processingScriptVersionId: dto.processingScriptVersionId,
          auxiliaryConfigurationId: dto.auxiliaryConfigurationId,
          baseline: dto.baseline,
          comment: dto.comment ?? null,
          parameters:
            dto.parameters === undefined || dto.parameters === null
              ? Prisma.JsonNull
              : (dto.parameters as Prisma.InputJsonValue),
        },
      });
      return processorVersionToDto(created);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `ProcessorVersion already exists for this (script version, aux config) pair.`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateProcessorVersionBody,
  ): Promise<ProcessorVersion> {
    await this.getById(id);
    const updated = await this.prisma.processorVersion.update({
      where: { id },
      data: {
        baseline: dto.baseline,
        comment: dto.comment,
        parameters:
          dto.parameters === undefined
            ? undefined
            : dto.parameters === null
              ? Prisma.JsonNull
              : (dto.parameters as Prisma.InputJsonValue),
      },
    });
    return processorVersionToDto(updated);
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.processorVersion.delete({ where: { id } });
  }
}
