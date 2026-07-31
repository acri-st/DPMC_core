import { PrismaService } from '@/core/prisma';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { TaskSchedule } from '@dpmc/client';
import { Prisma } from '@dpmc/prisma';
import { TaskService } from '@/modules/task/task.service';
import {
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  buildOrderBy,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import { computeNextRun, isValidCron } from './cron.util';
import type {
  CreateTaskScheduleBody,
  TaskScheduleListQuery,
  UpdateTaskScheduleBody,
} from './task-schedule.dto';

const DEFAULT_TZ = 'UTC';

// Columns the schedule list may be sorted by (real TaskSchedule scalar fields
// only — computed values like the human-readable recurrence or resolved target
// can't be ordered in the DB).
const SCHEDULE_SORTABLE = [
  'name',
  'kind',
  'nextRunAt',
  'lastRunAt',
  'enabled',
  'priority',
  'createdAt',
  'updatedAt',
  'id',
] as const;

function toJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined || value === null ? Prisma.JsonNull : value;
}

@Injectable()
export class TaskScheduleService {
  private readonly logger = new Logger(TaskScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TaskService,
  ) {}

  async list(
    projectId: number,
    query?: TaskScheduleListQuery,
  ): Promise<PaginatedResult<TaskSchedule>> {
    const p = query ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const { skip, take } = paginationSkipTake(p);
    const search = buildSearchWhere(['name'], p.q);
    const where = {
      projectId,
      deletedAt: null,
      ...(query?.kind?.length ? { kind: { in: query.kind } } : {}),
      ...(query?.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(search ?? {}),
    };
    // Default: newest-created first (id desc breaks ties for stable ordering);
    // overridable via ?sort=&order= against the SCHEDULE_SORTABLE allowlist.
    const orderBy = buildOrderBy(SCHEDULE_SORTABLE, query?.sort, query?.order, [
      { createdAt: 'desc' },
    ]);
    const [items, total] = await Promise.all([
      this.prisma.taskSchedule.findMany({ where, skip, take, orderBy }),
      this.prisma.taskSchedule.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: number, projectId: number): Promise<TaskSchedule> {
    const row = await this.prisma.taskSchedule.findFirst({
      where: { id, projectId, deletedAt: null },
    });
    if (!row) throw new NotFoundException(`TaskSchedule ${id} not found`);
    return row;
  }

  async create(
    projectId: number,
    dto: CreateTaskScheduleBody,
  ): Promise<TaskSchedule> {
    if (!isValidCron(dto.cronExpression)) {
      throw new BadRequestException(
        `Invalid cron expression: ${dto.cronExpression}`,
      );
    }
    const timezone = dto.timezone ?? DEFAULT_TZ;
    const nextRunAt = computeNextRun(dto.cronExpression, timezone, new Date());

    const created = await this.prisma.taskSchedule.create({
      data: {
        projectId,
        name: dto.name,
        enabled: dto.enabled ?? true,
        cronExpression: dto.cronExpression,
        timezone,
        kind: dto.kind,
        productionChainId: dto.productionChainId ?? null,
        processorVersionId: dto.processorVersionId ?? null,
        productId: dto.productId ?? null,
        productionMode: dto.productionMode,
        priority: dto.priority ?? 0,
        priorityClass: dto.priorityClass ?? 'OnDemand',
        parameters: toJson(dto.parameters),
        comment: dto.comment ?? null,
        nextRunAt,
      },
    });
    return created;
  }

  async update(
    id: number,
    projectId: number,
    dto: UpdateTaskScheduleBody,
  ): Promise<TaskSchedule> {
    if (dto.cronExpression !== undefined && !isValidCron(dto.cronExpression)) {
      throw new BadRequestException(
        `Invalid cron expression: ${dto.cronExpression}`,
      );
    }

    const existing = await this.getById(id, projectId);

    const cronExpression = dto.cronExpression ?? existing.cronExpression;
    const timezone = dto.timezone ?? existing.timezone;

    // Recompute nextRunAt whenever cron or timezone changes.
    const recompute =
      dto.cronExpression !== undefined || dto.timezone !== undefined;
    const nextRunAt = recompute
      ? computeNextRun(cronExpression, timezone, new Date())
      : undefined;

    const updated = await this.prisma.taskSchedule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.cronExpression !== undefined ? { cronExpression } : {}),
        ...(dto.timezone !== undefined ? { timezone } : {}),
        ...(dto.productionChainId !== undefined
          ? { productionChainId: dto.productionChainId }
          : {}),
        ...(dto.processorVersionId !== undefined
          ? { processorVersionId: dto.processorVersionId }
          : {}),
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.priorityClass !== undefined
          ? { priorityClass: dto.priorityClass }
          : {}),
        ...(dto.parameters !== undefined
          ? { parameters: toJson(dto.parameters) }
          : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
        ...(nextRunAt !== undefined ? { nextRunAt } : {}),
      },
    });
    return updated;
  }

  async remove(id: number, projectId: number): Promise<void> {
    await this.getById(id, projectId);
    await this.prisma.taskSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), enabled: false },
    });
  }

  /**
   * One evaluator tick. Returns the number of tasks created. For each due
   * schedule we first CLAIM it (advance nextRunAt via compare-and-swap on the
   * old value) so that, with multiple API instances, only one creates the task.
   * No backfill: a schedule that missed several occurrences fires once and
   * advances to the next future occurrence.
   */
  async runDue(now: Date): Promise<number> {
    const due = await this.prisma.taskSchedule.findMany({
      where: {
        enabled: true,
        deletedAt: null,
        nextRunAt: { lte: now, not: null },
      },
    });

    let created = 0;
    for (const schedule of due) {
      const previousNextRunAt = schedule.nextRunAt;
      if (!previousNextRunAt) continue;

      const newNextRunAt = computeNextRun(
        schedule.cronExpression,
        schedule.timezone,
        now,
      );

      // CLAIM: only succeeds if nobody advanced nextRunAt since we read it.
      const claim = await this.prisma.taskSchedule.updateMany({
        where: { id: schedule.id, nextRunAt: previousNextRunAt },
        data: { nextRunAt: newNextRunAt, lastRunAt: now },
      });
      if (claim.count === 0) continue; // another instance got it

      try {
        const commonBody = {
          productionChainId: schedule.productionChainId ?? undefined,
          processorVersionId: schedule.processorVersionId ?? undefined,
          productId: schedule.productId ?? undefined,
          productionMode: schedule.productionMode,
          priority: schedule.priority,
          priorityClass: schedule.priorityClass,
          parameters: schedule.parameters ?? null,
          comment: schedule.comment ?? null,
          scheduledStartTime: now,
        };
        const taskBody =
          schedule.kind === 'Standalone'
            ? { kind: 'Standalone' as const, ...commonBody }
            : { kind: 'Chain' as const, ...commonBody };

        const task = await this.tasks.create(
          schedule.projectId,
          taskBody as never,
        );
        await this.tasks.trigger(task.id, schedule.projectId);

        await this.prisma.taskSchedule.update({
          where: { id: schedule.id },
          data: { lastTaskId: task.id, lastError: null },
        });
        created += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Schedule ${schedule.id} failed to create task: ${message}`,
        );
        await this.prisma.taskSchedule.update({
          where: { id: schedule.id },
          data: { lastError: message },
        });
      }
    }
    return created;
  }
}
