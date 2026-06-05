import { PrismaService } from '@/core/prisma';
import { isUniqueViolation } from '@/common/utils';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuxiliaryConfiguration } from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type {
  CreateAuxiliaryConfigurationBody,
  UpdateAuxiliaryConfigurationBody,
} from './auxiliary-configuration.dto';
import { auxiliaryConfigurationToDto } from './auxiliary-configuration.utils';

@Injectable()
export class AuxiliaryConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<AuxiliaryConfiguration>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['name', 'baseline'], pagination.q);
    const where = { deletedAt: null, ...(search ?? {}) };
    const [records, total] = await Promise.all([
      this.prisma.auxiliaryConfiguration.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.auxiliaryConfiguration.count({ where }),
    ]);
    return { items: records.map(auxiliaryConfigurationToDto), total };
  }

  async getById(id: number): Promise<AuxiliaryConfiguration> {
    const record = await this.prisma.auxiliaryConfiguration.findFirst({
      where: { id, deletedAt: null },
    });
    if (!record) {
      throw new NotFoundException(`AuxiliaryConfiguration ${id} not found`);
    }
    return auxiliaryConfigurationToDto(record);
  }

  async create(
    dto: CreateAuxiliaryConfigurationBody,
  ): Promise<AuxiliaryConfiguration> {
    try {
      const created = await this.prisma.auxiliaryConfiguration.create({
        data: {
          name: dto.name,
          baseline: dto.baseline ?? null,
          comment: dto.comment ?? null,
          parameters:
            dto.parameters === undefined || dto.parameters === null
              ? Prisma.JsonNull
              : (dto.parameters as Prisma.InputJsonValue),
        },
      });
      return auxiliaryConfigurationToDto(created);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `AuxiliaryConfiguration with name "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateAuxiliaryConfigurationBody,
  ): Promise<AuxiliaryConfiguration> {
    await this.getById(id);
    try {
      const updated = await this.prisma.auxiliaryConfiguration.update({
        where: { id },
        data: {
          name: dto.name,
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
      return auxiliaryConfigurationToDto(updated);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `AuxiliaryConfiguration with name "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.auxiliaryConfiguration.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
