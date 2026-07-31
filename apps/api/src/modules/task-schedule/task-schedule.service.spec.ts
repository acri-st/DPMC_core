import { BadRequestException } from '@nestjs/common';
import { TaskScheduleService } from './task-schedule.service';

type AnyMock = { [k: string]: jest.Mock };

function makePrisma(): { taskSchedule: AnyMock } {
  return {
    taskSchedule: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe('TaskScheduleService.create', () => {
  it('rejects an invalid cron expression', async () => {
    const prisma = makePrisma();
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await expect(
      service.create(1, {
        kind: 'Chain',
        productionChainId: 11,
        name: 'bad',
        cronExpression: 'not a cron',
        productionMode: 'Generic',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taskSchedule.create).not.toHaveBeenCalled();
  });

  it('computes nextRunAt and persists the schedule', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.create.mockImplementation(({ data }: never) => ({
      id: 's-1',
      ...(data as object),
    }));
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await service.create(1, {
      kind: 'Chain',
      productionChainId: 11,
      name: 'nightly',
      cronExpression: '0 0 * * *',
      productionMode: 'Generic',
    } as never);

    const arg = prisma.taskSchedule.create.mock.calls[0][0];
    expect(arg.data.nextRunAt).toBeInstanceOf(Date);
    expect(arg.data.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('TaskScheduleService.update', () => {
  const existingRow = {
    id: 1,
    projectId: 1,
    cronExpression: '0 0 * * *',
    timezone: 'UTC',
    deletedAt: null,
  };

  it('rejects an invalid cron expression and does not touch the DB', async () => {
    const prisma = makePrisma();
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await expect(
      service.update(1, 1, { cronExpression: 'not a cron' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.taskSchedule.findFirst).not.toHaveBeenCalled();
    expect(prisma.taskSchedule.update).not.toHaveBeenCalled();
  });

  it('recomputes nextRunAt when cronExpression changes', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findFirst.mockResolvedValue(existingRow);
    prisma.taskSchedule.update.mockResolvedValue({});
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await service.update(1, 1, { cronExpression: '0 * * * *' });

    const arg = prisma.taskSchedule.update.mock.calls[0][0];
    const data = arg.data as Record<string, unknown>;
    expect(data.nextRunAt).toBeInstanceOf(Date);
  });

  it('does NOT recompute nextRunAt when only a non-cron field changes', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findFirst.mockResolvedValue(existingRow);
    prisma.taskSchedule.update.mockResolvedValue({});
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await service.update(1, 1, { priority: 5 });

    const arg = prisma.taskSchedule.update.mock.calls[0][0];
    const data = arg.data as Record<string, unknown>;
    expect(data.priority).toBe(5);
    expect(data).not.toHaveProperty('nextRunAt');
  });
});

describe('TaskScheduleService.remove', () => {
  it('soft-deletes by setting deletedAt and enabled:false', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findFirst.mockResolvedValue({
      id: 1,
      projectId: 1,
      cronExpression: '0 0 * * *',
      timezone: 'UTC',
      deletedAt: null,
    });
    prisma.taskSchedule.update.mockResolvedValue({});
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    await service.remove(1, 1);

    const arg = prisma.taskSchedule.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 1 });
    const data = arg.data as Record<string, unknown>;
    expect(data.enabled).toBe(false);
    expect(data.deletedAt).toBeInstanceOf(Date);
  });
});

describe('TaskScheduleService.runDue', () => {
  const baseRow = {
    id: 's-1',
    projectId: 'proj-1',
    cronExpression: '0 0 * * *',
    timezone: 'UTC',
    nextRunAt: new Date('2000-01-01T00:00:00.000Z'),
    kind: 'Chain',
    productionChainId: '11111111-1111-1111-1111-111111111111',
    processorVersionId: null,
    productId: null,
    productionMode: 'Generic',
    priority: 0,
    priorityClass: 'OnDemand',
    parameters: null,
    comment: null,
  };

  it('claims a due schedule, creates and triggers a Queued task', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findMany.mockResolvedValue([baseRow]);
    prisma.taskSchedule.updateMany.mockResolvedValue({ count: 1 });
    prisma.taskSchedule.update.mockResolvedValue({});
    const tasks = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      trigger: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    const promoted = await service.runDue(new Date());

    expect(promoted).toBe(1);
    // CAS matched on the old nextRunAt and advanced it
    const cas = prisma.taskSchedule.updateMany.mock.calls[0][0];
    expect(cas.where.id).toBe('s-1');
    expect(cas.where.nextRunAt).toEqual(baseRow.nextRunAt);
    expect(cas.data.nextRunAt.getTime()).toBeGreaterThan(
      baseRow.nextRunAt.getTime(),
    );
    expect(tasks.create).toHaveBeenCalledTimes(1);
    expect(tasks.trigger).toHaveBeenCalledTimes(1);
  });

  it('skips a schedule already claimed by another instance (CAS count 0)', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findMany.mockResolvedValue([baseRow]);
    prisma.taskSchedule.updateMany.mockResolvedValue({ count: 0 });
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    const promoted = await service.runDue(new Date());

    expect(promoted).toBe(0);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('records lastError when task creation fails but still advanced nextRunAt', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findMany.mockResolvedValue([baseRow]);
    prisma.taskSchedule.updateMany.mockResolvedValue({ count: 1 });
    prisma.taskSchedule.update.mockResolvedValue({});
    const tasks = {
      create: jest.fn().mockRejectedValue(new Error('chain gone')),
      trigger: jest.fn(),
    };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    const promoted = await service.runDue(new Date());

    expect(promoted).toBe(0);
    const errUpdate = prisma.taskSchedule.update.mock.calls.find(
      (c: any[]) => c[0]?.data?.lastError,
    );
    expect(errUpdate).toBeDefined();
  });
});

describe('TaskScheduleService.list', () => {
  it('returns paginated { items, total } with skip/take + count', async () => {
    const prisma = makePrisma();
    prisma.taskSchedule.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.taskSchedule.count.mockResolvedValue(1);
    const tasks = { create: jest.fn(), trigger: jest.fn() };
    const service = new TaskScheduleService(prisma as never, tasks as never);

    const res = await service.list(1, { page: 2, pageSize: 10 });

    expect(prisma.taskSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(res).toEqual({ items: [{ id: 1 }], total: 1 });
  });
});
