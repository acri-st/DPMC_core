import { PrismaService } from '@/core/prisma';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { JobListQuery } from './job.dto';

// Columns the job list may be sorted by (real Job scalar fields only).
const JOB_SORTABLE = [
  'createdAt',
  'startedAt',
  'endedAt',
  'status',
  'executionTag',
  'avgPower',
  'hostId',
  'batchId',
  'processingScriptVersionId',
  'updatedAt',
  'id',
] as const;
import {
  EVENTS,
  type JobStatusChangedPayload,
} from '@/core/monitoring/monitoring.events';
import { Job } from '@dpmc/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    projectId: number,
    query?: JobListQuery,
  ): Promise<PaginatedResult<Job>> {
    const p = query ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['executionTag'], p.q);
    const where = {
      projectId,
      ...(query?.status ? { status: query.status } : {}),
      ...(search ?? {}),
    };
    // Default: newest-created first (the list previously had no orderBy → the
    // rows came back in non-deterministic DB order). Overridable via ?sort=&order=.
    const orderBy = buildOrderBy(JOB_SORTABLE, query?.sort, query?.order, [
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({ where, skip, take, orderBy }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: number, projectId: number): Promise<Job> {
    const job = await this.prisma.job.findFirst({ where: { id, projectId } });
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  async cancel(id: number, projectId: number): Promise<Job> {
    const job = await this.prisma.job.findFirst({
      where: { id, projectId },
      include: {
        allocation: true,
        batch: { select: { productionChainId: true } },
      },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (!['Waiting', 'Ready', 'Running'].includes(job.status)) {
      throw new BadRequestException(
        `Job ${id} cannot be cancelled from status ${job.status}`,
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: { status: 'Cancelled', endedAt: now },
      });
      if (job.allocation && !job.allocation.releasedAt) {
        await tx.jobAllocation.update({
          where: { id: job.allocation.id },
          data: { releasedAt: now },
        });
      }
    });
    const updated = await this.prisma.job.findUniqueOrThrow({ where: { id } });
    const payload: JobStatusChangedPayload = {
      jobId: id,
      batchId: job.batchId,
      productionChainId: null,
      status: 'Cancelled',
      hostId: job.hostId ?? null,
      startedAt: job.startedAt?.toISOString() ?? null,
      endedAt: now.toISOString(),
    };
    this.events.emit(EVENTS.JOB_STATUS_CHANGED, payload);
    return updated;
  }

  async pause(id: number, projectId: number): Promise<Job> {
    const job = await this.prisma.job.findFirst({ where: { id, projectId } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.status !== 'Ready') {
      throw new BadRequestException(
        `Job ${id} cannot be paused from status ${job.status}`,
      );
    }
    if (job.paused) return job;
    return this.prisma.job.update({ where: { id }, data: { paused: true } });
  }

  async resume(id: number, projectId: number): Promise<Job> {
    const job = await this.prisma.job.findFirst({ where: { id, projectId } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (!job.paused) {
      throw new BadRequestException(`Job ${id} is not paused`);
    }
    return this.prisma.job.update({ where: { id }, data: { paused: false } });
  }
}
