import { PrismaService } from '@/core/prisma';
import { DataCenter, DataCenterDetail } from '@dpmc/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { toHostDto } from '@/modules/host/host.utils';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';

@Injectable()
export class DataCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<DataCenter>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['name', 'code'], pagination.q);
    const where = search ?? undefined;
    const [records, total] = await Promise.all([
      this.prisma.dataCenter.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.dataCenter.count({ where }),
    ]);
    return { items: records, total };
  }

  async getById(id: number): Promise<DataCenterDetail> {
    const dataCenter = await this.prisma.dataCenter.findUnique({
      where: { id },
      include: { hosts: { orderBy: { hostname: 'asc' } } },
    });

    if (!dataCenter) {
      throw new NotFoundException(`DataCenter ${id} not found`);
    }

    const { hosts, ...rest } = dataCenter;
    return {
      ...rest,
      hosts: hosts.map(toHostDto),
    };
  }
}
