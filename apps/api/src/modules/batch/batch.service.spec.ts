import { Test } from '@nestjs/testing';
import { PrismaService } from '@/core/prisma/prisma.service';
import { BatchService } from './batch.service';

describe('BatchService', () => {
  let service: BatchService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      batch: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      job: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const module = await Test.createTestingModule({
      providers: [BatchService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BatchService);
  });

  describe('list', () => {
    it('uses `in` for multi-value status', async () => {
      await service.list(1, {
        page: 1,
        pageSize: 25,
        status: ['Running', 'Success'],
      } as any);
      const where = prisma.batch.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['Running', 'Success'] });
    });

    it('uses `in` for multi-value kind', async () => {
      await service.list(1, {
        page: 1,
        pageSize: 25,
        kind: ['Chain'],
      } as any);
      const where = prisma.batch.findMany.mock.calls[0][0].where;
      expect(where.kind).toEqual({ in: ['Chain'] });
    });

    it('omits status/kind when empty/undefined', async () => {
      await service.list(1, { page: 1, pageSize: 25 });
      const where = prisma.batch.findMany.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
      expect(where.kind).toBeUndefined();
    });
  });
});
