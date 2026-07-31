import { PrismaService } from '@/core/prisma';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolDetail } from '@dpmc/client';
import { toHostDto } from '../host/host.utils';
import {
  PaginatedResult,
  PaginationQuery,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { CreatePoolBody, UpdatePoolBody } from './pool.dto';

// Columns the pool list may be sorted by (real Pool scalar fields only —
// computed values like hostCount/dataCenterCount can't be ordered in the DB).
const POOL_SORTABLE = [
  'name',
  'comment',
  'createdAt',
  'updatedAt',
  'id',
] as const;

@Injectable()
export class PoolService {
  constructor(private readonly prisma: PrismaService) {}

  async list(pagination: PaginationQuery): Promise<PaginatedResult<Pool>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['name'], pagination.q);
    const where = search ?? undefined;
    // Default: name asc (id desc breaks ties for stable pagination);
    // overridable via ?sort=&order= against the POOL_SORTABLE allowlist.
    const orderBy = buildOrderBy(
      POOL_SORTABLE,
      pagination.sort,
      pagination.order,
      [{ name: 'asc' }, { id: 'desc' }],
    );
    const [rawItems, total] = await Promise.all([
      this.prisma.pool.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: { select: { hosts: true } },
          hosts: { select: { host: { select: { dataCenterId: true } } } },
        },
      }),
      this.prisma.pool.count({ where }),
    ]);
    const items: Pool[] = rawItems.map(({ _count, hosts, ...rest }) => ({
      ...rest,
      hostCount: _count.hosts,
      dataCenterCount: new Set(hosts.map((ph) => ph.host.dataCenterId)).size,
    }));
    return { items, total };
  }

  async getById(id: number): Promise<Pool> {
    const pool = await this.prisma.pool.findUnique({ where: { id } });
    if (!pool) {
      throw new NotFoundException(`Pool ${id} not found`);
    }
    return pool;
  }

  async getDetail(id: number): Promise<PoolDetail> {
    const pool = await this.prisma.pool.findUnique({
      where: { id },
      include: {
        hosts: {
          include: { host: true },
          orderBy: { host: { hostname: 'asc' } },
        },
      },
    });
    if (!pool) {
      throw new NotFoundException(`Pool ${id} not found`);
    }
    const { hosts, ...rest } = pool;
    return { ...rest, hosts: hosts.map((ph) => toHostDto(ph.host)) };
  }

  async create(dto: CreatePoolBody): Promise<Pool> {
    try {
      return await this.prisma.pool.create({
        data: {
          name: dto.name,
          comment: dto.comment ?? null,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Pool with name "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdatePoolBody): Promise<Pool> {
    await this.getById(id);
    try {
      return await this.prisma.pool.update({
        where: { id },
        data: {
          name: dto.name,
          comment: dto.comment,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Pool with name "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.prisma.pool.delete({ where: { id } });
  }

  async addHost(poolId: number, hostId: number): Promise<Pool> {
    await this.getById(poolId);
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    });
    if (!host) {
      throw new NotFoundException(`Host ${hostId} not found`);
    }
    // Idempotent upsert
    await this.prisma.poolHost.upsert({
      where: { poolId_hostId: { poolId, hostId } },
      create: { poolId, hostId },
      update: {},
    });
    return this.getById(poolId);
  }

  async removeHost(poolId: number, hostId: number): Promise<void> {
    await this.getById(poolId);
    const existing = await this.prisma.poolHost.findUnique({
      where: { poolId_hostId: { poolId, hostId } },
    });
    if (!existing) {
      throw new NotFoundException(
        `Host ${hostId} is not part of pool ${poolId}`,
      );
    }
    await this.prisma.poolHost.delete({
      where: { poolId_hostId: { poolId, hostId } },
    });
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
