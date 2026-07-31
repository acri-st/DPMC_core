import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateDatasetBody, UpdateDatasetBody } from '@dpmc/client';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  buildOrderBy,
  buildSearchWhere,
  type SortOrder,
} from '@/common/utils/pagination';

// Columns the dataset list may be sorted by (real Dataset scalar fields only).
const DATASET_SORTABLE = [
  'name',
  'producedByBatchId',
  'createdAt',
  'id',
] as const;

interface ListOpts {
  skip: number;
  take: number;
  producedByBatchId?: number;
  name?: string;
  origin?: 'batch' | 'manual' | 'user' | 'system' | 'all';
  q?: string;
  sort?: string;
  order?: SortOrder;
}

// Runtime ("system") datasets are the per-batch outputs (`batch:<id>:out`,
// producedByBatchId set) and the task-planning datasets (`task:<id>:aux`,
// `task:<id>:input…` — producedByBatchId null but machine-named).
const SYSTEM_NAME_PREFIXES = ['task:', 'batch:'];

@Injectable()
export class DatasetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: ListOpts) {
    const where: any = {};
    if (opts.producedByBatchId)
      where.producedByBatchId = opts.producedByBatchId;
    if (opts.name) where.name = { contains: opts.name, mode: 'insensitive' };
    // Default to user datasets so every chain run's internal artifacts don't
    // swamp the list; lookups scoped to a batch (producedByBatchId) see all.
    const origin = opts.origin ?? (opts.producedByBatchId ? 'all' : 'user');
    if (origin === 'batch') where.producedByBatchId = { not: null };
    else if (origin === 'manual') where.producedByBatchId = null;
    else if (origin === 'user') {
      where.producedByBatchId = null;
      where.NOT = SYSTEM_NAME_PREFIXES.map((p) => ({
        name: { startsWith: p },
      }));
    } else if (origin === 'system') {
      where.AND = [
        {
          OR: [
            { producedByBatchId: { not: null } },
            ...SYSTEM_NAME_PREFIXES.map((p) => ({ name: { startsWith: p } })),
          ],
        },
      ];
    }
    const searchWhere = buildSearchWhere(['name'], opts.q);
    if (searchWhere) Object.assign(where, searchWhere);
    // Default: newest-created first (id desc breaks ties for stable pagination);
    // overridable via ?sort=&order= against the DATASET_SORTABLE allowlist.
    const orderBy = buildOrderBy(DATASET_SORTABLE, opts.sort, opts.order, [
      { createdAt: 'desc' },
    ]);
    const [data, total] = await Promise.all([
      this.prisma.dataset.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy,
      }),
      this.prisma.dataset.count({ where }),
    ]);
    return { data, total };
  }

  async getById(id: number) {
    const ds = await this.prisma.dataset.findUnique({
      where: { id },
      include: { products: { orderBy: { sequence: 'asc' } } },
    });
    if (!ds) throw new NotFoundException(`Dataset ${id} not found`);
    return ds;
  }

  async create(body: CreateDatasetBody) {
    return this.prisma.dataset.create({
      data: {
        name: body.name ?? null,
        producedByBatchId: null,
        products: {
          create: body.products.map((p, i) => ({
            productId: p.productId,
            role: p.role,
            sequence: p.sequence ?? i,
          })),
        },
      },
      include: { products: { orderBy: { sequence: 'asc' } } },
    });
  }

  async update(id: number, body: UpdateDatasetBody) {
    const existing = await this.prisma.dataset.findUnique({
      where: { id },
      select: { id: true, producedByBatchId: true },
    });
    if (!existing) throw new NotFoundException(`Dataset ${id} not found`);
    if (existing.producedByBatchId) {
      throw new ConflictException(
        `Dataset ${id} is immutable (produced by Batch ${existing.producedByBatchId})`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      if (body.products) {
        await tx.datasetProduct.deleteMany({ where: { datasetId: id } });
        await tx.datasetProduct.createMany({
          data: body.products.map((p, i) => ({
            datasetId: id,
            productId: p.productId,
            role: p.role,
            sequence: p.sequence ?? i,
          })),
        });
      }
      return tx.dataset.update({
        where: { id },
        data: { ...(body.name !== undefined ? { name: body.name } : {}) },
        include: { products: { orderBy: { sequence: 'asc' } } },
      });
    });
  }

  async delete(id: number) {
    const refs = await this.prisma.batchDatasetIn.count({
      where: { datasetId: id },
    });
    if (refs > 0) {
      throw new ConflictException(
        `Dataset ${id} is referenced by ${refs} batch(es) and cannot be deleted`,
      );
    }
    await this.prisma.dataset.delete({ where: { id } });
  }
}
