import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ProcessingScriptService } from './processing-script.service';

describe('ProcessingScriptService', () => {
  let service: ProcessingScriptService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      processingScript: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        ProcessingScriptService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProcessingScriptService);
  });

  describe('list', () => {
    it('returns paginated scripts with the default version summary', async () => {
      prisma.processingScript.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'AC',
          acronym: 'AC',
          defaultVersionId: 10,
          defaultVersion: { id: 10, version: '1.0.0' },
        },
      ]);
      prisma.processingScript.count.mockResolvedValue(1);
      const res = await service.list({ page: 1, pageSize: 10 });
      expect(prisma.processingScript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            defaultVersion: { select: { id: true, version: true } },
          },
        }),
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0].defaultVersion).toEqual({ id: 10, version: '1.0.0' });
      expect(res.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.processingScript.findUnique.mockResolvedValue(null);
      await expect(service.getById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('includes versions+executables and serializes BigInt resources to strings', async () => {
      prisma.processingScript.findUnique.mockResolvedValue({
        id: 1,
        name: 'Atmospheric Correction',
        acronym: 'AC',
        defaultVersionId: 10,
        versions: [
          {
            id: 10,
            processingScriptId: 1,
            version: '1.0.0',
            isLatest: true,
            runtime: 'Docker',
            imageUrl: 'registry/ac',
            imageTag: '1.0.0',
            imageChecksum: null,
            requiredCpu: 2,
            requiredRam: 8589934592n,
            requiredDisk: 10737418240n,
            requiresGpu: false,
            gpuCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            executables: [
              {
                id: 100,
                processingScriptVersionId: 10,
                scriptType: 'Python',
                stage: 'Exe',
                path: '/app/run.py',
                name: 'run',
                version: null,
                sequence: 0,
                args: null,
              },
            ],
          },
        ],
      });

      const res: any = await service.getById(1);

      expect(prisma.processingScript.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            versions: expect.objectContaining({
              orderBy: [{ isLatest: 'desc' }, { id: 'desc' }],
              include: expect.objectContaining({
                executables: expect.objectContaining({
                  orderBy: [{ stage: 'asc' }, { sequence: 'asc' }],
                }),
              }),
            }),
          }),
        }),
      );
      expect(res.versions).toHaveLength(1);
      expect(res.versions[0].requiredRam).toBe('8589934592');
      expect(res.versions[0].requiredDisk).toBe('10737418240');
      expect(res.versions[0].executables).toHaveLength(1);
    });
  });
});
