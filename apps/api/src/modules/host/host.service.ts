import { PrismaService } from '@/core/prisma';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import type { HostListQuery } from './host.dto';

// Columns the host list may be sorted by (real Host scalar fields only).
const HOST_SORTABLE = [
  'hostname',
  'status',
  'ipAddress',
  'osType',
  'osVersion',
  'schedulingPriority',
  'nbCores',
  'ram',
  'disk',
  'gpuCount',
  'containerRuntime',
  'lastHeartbeatAt',
  'createdAt',
  'updatedAt',
  'id',
] as const;
import { toBigInt } from '@/common/utils';
import {
  EVENTS,
  type HostHeartbeatPayload,
  type HostLogCreatedPayload,
} from '@/core/monitoring/monitoring.events';
import type {
  Batch,
  Host,
  HostBatchSummary,
  HostLog,
  HostLogEntry,
  HostLogLevel,
  HostMetrics,
} from '@dpmc/client';

import type { RegisterHostInput } from './host.dto';
import { hasAnyMetric, toHostDto, toHostLogDto } from './host.utils';
import type { ContainerRuntime, HostStatus } from '@dpmc/prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class HostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async register(input: RegisterHostInput): Promise<Host> {
    const dataCenter = await this.prisma.dataCenter.findUnique({
      where: { code: input.dataCenterCode },
      select: { id: true },
    });
    if (!dataCenter) {
      throw new NotFoundException(
        `DataCenter ${input.dataCenterCode} not found`,
      );
    }

    let ram: bigint;
    let disk: bigint;
    try {
      ram = toBigInt(input.ram);
      disk = toBigInt(input.disk);
    } catch {
      throw new BadRequestException(
        'ram and disk must be non-negative integer byte counts',
      );
    }

    const host = await this.prisma.host.upsert({
      where: { hostname: input.hostname },
      update: {
        dataCenterId: dataCenter.id,
        ipAddress: input.ipAddress,
        osType: input.osType,
        osVersion: input.osVersion,
        processingDir: input.processingDir,
        cacheDir: input.cacheDir,
        nbCores: input.nbCores,
        ram,
        disk,
        schedulingPriority: input.schedulingPriority,
        status: 'Up',
        hasGpu: input.hasGpu ?? false,
        gpuCount: input.gpuCount ?? 0,
        gpuModel: input.gpuModel ?? null,
        containerRuntime:
          (input.containerRuntime as ContainerRuntime | undefined) ?? 'None',
        lastHeartbeatAt: new Date(),
      },
      create: {
        dataCenterId: dataCenter.id,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        osType: input.osType,
        osVersion: input.osVersion,
        processingDir: input.processingDir,
        cacheDir: input.cacheDir,
        nbCores: input.nbCores,
        ram,
        disk,
        schedulingPriority: input.schedulingPriority,
        status: 'Up',
        hasGpu: input.hasGpu ?? false,
        gpuCount: input.gpuCount ?? 0,
        gpuModel: input.gpuModel ?? null,
        containerRuntime:
          (input.containerRuntime as ContainerRuntime | undefined) ?? 'None',
        lastHeartbeatAt: new Date(),
      },
    });

    return toHostDto(host);
  }

  async list(query?: HostListQuery): Promise<PaginatedResult<Host>> {
    const p = query ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['hostname', 'ipAddress'], p.q);
    const where = {
      ...(query?.status?.length ? { status: { in: query.status } } : {}),
      ...(query?.containerRuntime?.length
        ? { containerRuntime: { in: query.containerRuntime } }
        : {}),
      ...(search ?? {}),
    };
    // Default: hostname ascending; overridable via ?sort=&order= against the
    // HOST_SORTABLE allowlist.
    const orderBy = buildOrderBy(HOST_SORTABLE, query?.sort, query?.order, [
      { hostname: 'asc' },
    ]);
    const [hosts, total] = await Promise.all([
      this.prisma.host.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.host.count({ where }),
    ]);
    return { items: hosts.map(toHostDto), total };
  }

  async getById(id: number): Promise<Host> {
    const host = await this.prisma.host.findUnique({ where: { id } });
    if (!host) {
      throw new NotFoundException(`Host ${id} not found`);
    }
    return toHostDto(host);
  }

  async updateStatus(id: number, status: HostStatus): Promise<Host> {
    const updated = await this.prisma.host.updateMany({
      where: { id },
      data: { status },
    });
    if (updated.count === 0) {
      throw new NotFoundException(`Host ${id} not found`);
    }
    const host = await this.prisma.host.findUniqueOrThrow({ where: { id } });
    return toHostDto(host);
  }

  async heartbeat(
    id: number,
    metrics?: {
      cpuLoad?: number;
      memUsage?: number;
      diskUsage?: number;
      ioBandwidth?: number;
      runningJobs?: number;
    },
  ): Promise<Host> {
    const now = new Date();
    const updated = await this.prisma.host.updateMany({
      where: { id },
      data: { lastHeartbeatAt: now, status: 'Up' },
    });
    if (updated.count === 0) {
      throw new NotFoundException(`Host ${id} not found`);
    }

    if (metrics && hasAnyMetric(metrics)) {
      await this.prisma.hostMetrics.create({
        data: {
          hostId: id,
          cpuLoad: metrics.cpuLoad ?? 0,
          memUsage: metrics.memUsage ?? 0,
          diskUsage: metrics.diskUsage ?? 0,
          ioBandwidth: metrics.ioBandwidth ?? null,
          runningJobs: metrics.runningJobs ?? 0,
          sampledAt: now,
        },
      });
    }

    const host = await this.prisma.host.findUniqueOrThrow({ where: { id } });
    const dto = toHostDto(host);

    const payload: HostHeartbeatPayload = {
      hostId: dto.id,
      isAvailable: dto.status === 'Up',
      lastHeartbeatAt: now.toISOString(),
    };
    this.events.emit(EVENTS.HOST_HEARTBEAT, payload);

    return dto;
  }

  async ingestLogs(
    hostId: number,
    entries: ReadonlyArray<HostLogEntry>,
  ): Promise<{ accepted: number }> {
    if (entries.length === 0) {
      return { accepted: 0 };
    }
    const existing = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Host ${hostId} not found`);
    }

    const createdAt = new Date();
    const rows = entries.map((entry) => ({
      hostId,
      // jobId is optional: worker-system logs (heartbeat, registration)
      // carry no job context, IPF stdout/stderr does. Persisted as-is.
      jobId: entry.jobId ?? null,
      level: entry.level,
      message: entry.message,
      loggedAt: entry.loggedAt,
      createdAt,
    }));

    // Multi-row INSERT via raw SQL — keeps the service independent of the
    // generated Prisma client (HostLog ships in a separate migration that may
    // not be re-generated yet on a developer machine). The integer "id" is
    // assigned by the DB sequence and returned so we can build the SSE payload.
    const placeholders = rows
      .map(
        (_, i) =>
          `($${i * 5 + 1}::integer, $${i * 5 + 2}::integer, $${i * 5 + 3}::host_log_level, $${i * 5 + 4}::text, $${i * 5 + 5}::timestamptz)`,
      )
      .join(', ');
    const params = rows.flatMap((row) => [
      row.hostId,
      row.jobId,
      row.level.toLowerCase(),
      row.message,
      row.loggedAt,
    ]);
    const inserted = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO "host_log" ("hostId", "jobId", "level", "message", "loggedAt") VALUES ${placeholders} RETURNING "id"`,
      ...params,
    );

    const payload: HostLogCreatedPayload = {
      hostId,
      logs: rows.map((row, i) => ({
        id: inserted[i].id,
        jobId: row.jobId,
        level: row.level,
        message: row.message,
        loggedAt: row.loggedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      })),
    };
    this.events.emit(EVENTS.HOST_LOG_CREATED, payload);

    return { accepted: rows.length };
  }

  async capacitySummary(): Promise<{
    hostsTotal: number;
    hostsUp: number;
    totalCores: number;
    availableCores: number;
    totalRam: string;
    availableRam: string;
    totalDisk: string;
    availableDisk: string;
    gpuHosts: number;
  }> {
    const hosts = await this.prisma.host.findMany({
      select: {
        id: true,
        status: true,
        nbCores: true,
        ram: true,
        disk: true,
        hasGpu: true,
      },
    });
    const allocations = await this.prisma.jobAllocation.findMany({
      where: { releasedAt: null },
      select: {
        reservedCpu: true,
        reservedRam: true,
        reservedDisk: true,
        hostId: true,
      },
    });
    const allocByHost = new Map<
      number,
      { cpu: number; ram: bigint; disk: bigint }
    >();
    for (const a of allocations) {
      const cur = allocByHost.get(a.hostId) ?? { cpu: 0, ram: 0n, disk: 0n };
      cur.cpu += a.reservedCpu;
      cur.ram += a.reservedRam;
      cur.disk += a.reservedDisk;
      allocByHost.set(a.hostId, cur);
    }
    let totalCores = 0;
    let availableCores = 0;
    let totalRam = 0n;
    let availableRam = 0n;
    let totalDisk = 0n;
    let availableDisk = 0n;
    let hostsUp = 0;
    let gpuHosts = 0;
    for (const h of hosts) {
      totalCores += h.nbCores;
      totalRam += h.ram;
      totalDisk += h.disk;
      if (h.hasGpu) gpuHosts += 1;
      if (h.status === 'Up') {
        hostsUp += 1;
        const a = allocByHost.get(h.id) ?? { cpu: 0, ram: 0n, disk: 0n };
        availableCores += Math.max(0, h.nbCores - a.cpu);
        availableRam += h.ram - a.ram > 0n ? h.ram - a.ram : 0n;
        availableDisk += h.disk - a.disk > 0n ? h.disk - a.disk : 0n;
      }
    }
    return {
      hostsTotal: hosts.length,
      hostsUp,
      totalCores,
      availableCores,
      totalRam: totalRam.toString(),
      availableRam: availableRam.toString(),
      totalDisk: totalDisk.toString(),
      availableDisk: availableDisk.toString(),
      gpuHosts,
    };
  }

  async statusList(): Promise<
    Array<{
      id: number;
      hostname: string;
      status: HostStatus;
      lastHeartbeatAt: Date | null;
    }>
  > {
    return this.prisma.host.findMany({
      select: {
        id: true,
        hostname: true,
        status: true,
        lastHeartbeatAt: true,
      },
      orderBy: { hostname: 'asc' },
    });
  }

  async listActive(): Promise<Host[]> {
    const hosts = await this.prisma.host.findMany({
      where: { status: 'Up', lastHeartbeatAt: { not: null } },
      orderBy: { hostname: 'asc' },
    });
    return hosts.map(toHostDto);
  }

  async listMetrics(
    hostId: number,
    options: { since?: Date; limit: number },
  ): Promise<HostMetrics[]> {
    const existing = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Host ${hostId} not found`);
    const limit = Math.min(Math.max(options.limit, 1), 500);
    return this.prisma.hostMetrics.findMany({
      where: {
        hostId,
        ...(options.since ? { sampledAt: { gte: options.since } } : {}),
      },
      orderBy: { sampledAt: 'desc' },
      take: limit,
    });
  }

  async listRecentBatches(
    hostId: number,
    limit: number,
  ): Promise<HostBatchSummary[]> {
    const existing = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Host ${hostId} not found`);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // Pick the most-recent jobs on this host first, then dedupe by batchId so
    // we only return distinct batches. We over-fetch since several jobs of the
    // same batch may have run on the host.
    const recentJobs = await this.prisma.job.findMany({
      where: { hostId },
      select: {
        batchId: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
      },
      orderBy: [
        { endedAt: { sort: 'desc', nulls: 'last' } },
        { startedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      take: safeLimit * 5,
    });

    type Agg = {
      jobsOnHost: number;
      lastJobEndedAt: Date | null;
      lastJobStartedAt: Date | null;
    };
    const byBatch = new Map<number, Agg>();
    const order: number[] = [];
    for (const j of recentJobs) {
      const cur = byBatch.get(j.batchId);
      if (!cur) {
        byBatch.set(j.batchId, {
          jobsOnHost: 1,
          lastJobEndedAt: j.endedAt,
          lastJobStartedAt: j.startedAt,
        });
        order.push(j.batchId);
      } else {
        cur.jobsOnHost += 1;
        if (
          j.endedAt &&
          (!cur.lastJobEndedAt || j.endedAt > cur.lastJobEndedAt)
        )
          cur.lastJobEndedAt = j.endedAt;
        if (
          j.startedAt &&
          (!cur.lastJobStartedAt || j.startedAt > cur.lastJobStartedAt)
        )
          cur.lastJobStartedAt = j.startedAt;
      }
    }

    const batchIds = order.slice(0, safeLimit);
    if (batchIds.length === 0) return [];

    const batches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds } },
    });
    const batchById = new Map(batches.map((b) => [b.id, b]));

    return batchIds
      .map((id) => {
        const batch = batchById.get(id);
        const agg = byBatch.get(id);
        if (!batch || !agg) return null;
        return {
          batch: batch as unknown as Batch,
          jobsOnHost: agg.jobsOnHost,
          lastJobEndedAt: agg.lastJobEndedAt,
          lastJobStartedAt: agg.lastJobStartedAt,
        } satisfies HostBatchSummary;
      })
      .filter((v): v is HostBatchSummary => v !== null);
  }

  async listLogs(
    hostId: number,
    options: { limit: number; before?: Date },
  ): Promise<{ logs: HostLog[]; nextBefore: Date | null }> {
    const existing = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Host ${hostId} not found`);
    }

    const limit = Math.min(Math.max(options.limit, 1), 500);
    const before = options.before ?? new Date('9999-12-31T23:59:59Z');

    const rows = await this.prisma.hostLog.findMany({
      where: { hostId, loggedAt: { lt: before } },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });

    const logs = rows.map(toHostLogDto);
    const nextBefore =
      logs.length === limit ? logs[logs.length - 1].loggedAt : null;
    return { logs, nextBefore };
  }

  /**
   * Batch-scoped log feed. Joins host_log → job → batch so the BatchDetailPage
   * can show the IPF stdout/stderr regardless of which host(s) executed
   * the jobs. Cursor-paginated via `before` (loggedAt < before). DESC order
   * so the freshest line lands first; the UI flips it visually if needed.
   */
  async listLogsForBatch(
    batchId: number,
    options: { limit: number; before?: Date; level?: HostLogLevel },
  ): Promise<{ logs: HostLog[]; nextBefore: Date | null }> {
    const limit = Math.min(Math.max(options.limit, 1), 500);
    const before = options.before ?? new Date('9999-12-31T23:59:59Z');

    const rows = await this.prisma.hostLog.findMany({
      where: {
        loggedAt: { lt: before },
        ...(options.level ? { level: options.level } : {}),
        job: { batchId },
      },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });

    const logs = rows.map(toHostLogDto);
    const nextBefore =
      logs.length === limit ? logs[logs.length - 1].loggedAt : null;
    return { logs, nextBefore };
  }
}
