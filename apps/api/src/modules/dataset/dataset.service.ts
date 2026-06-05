import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateDatasetBody, UpdateDatasetBody } from '@dpmc/client';
import { PrismaService } from '@/core/prisma/prisma.service';

interface ListOpts {
  skip: number;
  take: number;
  producedByBatchId?: number;
  name?: string;
}

@Injectable()
export class DatasetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: ListOpts) {
    const where: any = {};
    if (opts.producedByBatchId)
      where.producedByBatchId = opts.producedByBatchId;
    if (opts.name) where.name = { contains: opts.name, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.dataset.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy: { createdAt: 'desc' },
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
