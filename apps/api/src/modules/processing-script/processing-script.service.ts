import { PrismaService } from '@/core/prisma';
import { ProcessingScript } from '@dpmc/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';

@Injectable()
export class ProcessingScriptService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<ProcessingScript>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['name', 'acronym'], pagination.q);
    const where = search ?? undefined;
    const [records, total] = await Promise.all([
      this.prisma.processingScript.findMany({ where, skip, take }),
      this.prisma.processingScript.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number): Promise<ProcessingScript> {
    const script = await this.prisma.processingScript.findUnique({
      where: { id },
    });
    if (!script) {
      throw new NotFoundException(`ProcessingScript ${id} not found`);
    }
    return script;
  }
}
