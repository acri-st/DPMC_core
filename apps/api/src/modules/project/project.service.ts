import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { Project } from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';

import { PrismaService } from '@/core/prisma';
import {
  PaginatedResult,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type {
  CreateProjectBody,
  ProjectListQuery,
  UpdateProjectBody,
} from './project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProjectListQuery): Promise<PaginatedResult<Project>> {
    const { skip, take } = paginationSkipTake(query);
    const search = buildSearchWhere(['identifier', 'name'], query.q);
    const where = {
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.isDefault !== undefined ? { isDefault: query.isDefault } : {}),
      ...(search ?? {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectBody): Promise<Project> {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.project.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.project.create({
        data: {
          identifier: dto.identifier,
          name: dto.name,
          comment: dto.comment ?? null,
          isActive: dto.isActive ?? true,
          allowedProductionModes: dto.allowedProductionModes ?? undefined,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async update(id: number, dto: UpdateProjectBody): Promise<Project> {
    await this.getById(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.project.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      if (dto.isDefault === false) {
        const current = await tx.project.findUnique({
          where: { id },
          select: { isDefault: true },
        });
        if (current?.isDefault) {
          throw new ConflictException(
            'Cannot un-set isDefault directly. Promote another project via /project/:id/set-default first.',
          );
        }
      }
      return tx.project.update({
        where: { id },
        data: {
          identifier: dto.identifier,
          name: dto.name,
          comment: dto.comment,
          isActive: dto.isActive,
          allowedProductionModes: dto.allowedProductionModes ?? undefined,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async setDefault(id: number): Promise<Project> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.project.findFirst({
        where: { id, deletedAt: null, isActive: true },
      });
      if (!target) {
        throw new NotFoundException(`Active project ${id} not found`);
      }
      await tx.project.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      return tx.project.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async delete(id: number): Promise<void> {
    const project = await this.getById(id);
    if (project.isDefault) {
      throw new ConflictException(
        'Cannot delete the default project. Promote another project as default first.',
      );
    }
    try {
      await this.prisma.project.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          'Project has related tasks, batches, jobs, or production chains.',
        );
      }
      throw err;
    }
  }

  /**
   * Used by other modules that need a default project (e.g., Task service).
   * Returns the current `isDefault` project, falling back to the oldest active.
   */
  async getDefault(): Promise<Project> {
    const project =
      (await this.prisma.project.findFirst({
        where: { isDefault: true, isActive: true, deletedAt: null },
      })) ??
      (await this.prisma.project.findFirst({
        where: { isActive: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }));
    if (!project) throw new NotFoundException('No active project available');
    return project;
  }
}
