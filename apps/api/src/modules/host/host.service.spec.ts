import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/core/prisma/prisma.service';
import { HostService } from './host.service';

describe('HostService', () => {
  let service: HostService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      host: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        HostService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: {} },
      ],
    }).compile();
    service = module.get(HostService);
  });

  describe('list', () => {
    it('uses `in` for multi-value status', async () => {
      await service.list({
        page: 1,
        pageSize: 25,
        status: ['Up', 'Busy'],
      } as any);
      const where = prisma.host.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['Up', 'Busy'] });
    });

    it('uses `in` for multi-value containerRuntime', async () => {
      await service.list({
        page: 1,
        pageSize: 25,
        containerRuntime: ['Docker'],
      } as any);
      const where = prisma.host.findMany.mock.calls[0][0].where;
      expect(where.containerRuntime).toEqual({ in: ['Docker'] });
    });

    it('omits filters when arrays are empty/undefined', async () => {
      await service.list({ page: 1, pageSize: 25 });
      const where = prisma.host.findMany.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
      expect(where.containerRuntime).toBeUndefined();
    });
  });
});
