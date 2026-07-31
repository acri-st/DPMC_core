import { Test } from '@nestjs/testing';
import { PrismaService } from '@/core/prisma/prisma.service';
import { S3Service } from '@/core/s3';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: {} },
      ],
    }).compile();
    service = module.get(TaskService);
  });

  describe('list', () => {
    it('uses `in` for multi-value status', async () => {
      await service.list(1, {
        page: 1,
        pageSize: 25,
        status: ['Running', 'Done'],
      } as any);
      const where = prisma.task.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['Running', 'Done'] });
    });

    it('uses `in` for multi-value kind', async () => {
      await service.list(1, {
        page: 1,
        pageSize: 25,
        kind: ['Chain'],
      } as any);
      const where = prisma.task.findMany.mock.calls[0][0].where;
      expect(where.kind).toEqual({ in: ['Chain'] });
    });

    it('omits status/kind when arrays empty/undefined', async () => {
      await service.list(1, { page: 1, pageSize: 25 });
      const where = prisma.task.findMany.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
      expect(where.kind).toBeUndefined();
    });
  });
});
