import { PrismaService } from '@/core/prisma';
import { ProcessingScriptListItem, ProcessingScriptDetail } from '@dpmc/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaginatedResult,
  PaginationQuery,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import { serializeBigInt } from '@/common/utils';

// Columns the processing-script list may be sorted by (real scalar fields).
const PROCESSING_SCRIPT_SORTABLE = [
  'name',
  'acronym',
  'createdAt',
  'updatedAt',
  'id',
] as const;

@Injectable()
export class ProcessingScriptService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<ProcessingScriptListItem>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['name', 'acronym'], pagination.q);
    const where = search ?? undefined;
    // Default: alphabetical by name (the list previously had no orderBy → the
    // rows came back in non-deterministic DB order). Overridable via ?sort=&order=.
    const orderBy = buildOrderBy(
      PROCESSING_SCRIPT_SORTABLE,
      pagination.sort,
      pagination.order,
      [{ name: 'asc' }, { id: 'asc' }],
    );
    const [records, total] = await Promise.all([
      this.prisma.processingScript.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          defaultVersion: { select: { id: true, version: true } },
        },
      }),
      this.prisma.processingScript.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number): Promise<ProcessingScriptDetail> {
    const script = await this.prisma.processingScript.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: [{ isLatest: 'desc' }, { id: 'desc' }],
          include: {
            executables: {
              orderBy: [{ stage: 'asc' }, { sequence: 'asc' }],
            },
          },
        },
      },
    });
    if (!script) {
      throw new NotFoundException(`ProcessingScript ${id} not found`);
    }
    // BigInt resource fields (requiredRam/requiredDisk) are not JSON-safe;
    // serializeBigInt rewrites them to decimal strings.
    return serializeBigInt(script) as ProcessingScriptDetail;
  }
}
