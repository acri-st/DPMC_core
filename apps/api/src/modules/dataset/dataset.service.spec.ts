import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { DatasetService } from './dataset.service';

describe('DatasetService', () => {
  let service: DatasetService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      dataset: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [DatasetService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DatasetService);
  });

  describe('list', () => {
    it('returns paginated datasets', async () => {
      prisma.dataset.findMany.mockResolvedValue([
        {
          id: 'd1',
          name: 'one',
          producedByBatchId: null,
          createdAt: new Date(),
        },
      ]);
      prisma.dataset.count.mockResolvedValue(1);
      const res = await service.list({ skip: 0, take: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.dataset.findUnique.mockResolvedValue(null);
      await expect(service.getById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
    it('returns the dataset with products joined', async () => {
      prisma.dataset.findUnique.mockResolvedValue({
        id: 1,
        name: null,
        producedByBatchId: null,
        createdAt: new Date(),
        products: [{ datasetId: 1, productId: 1, role: 'input', sequence: 0 }],
      });
      const res = await service.getById(1);
      expect(res.products).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a manual dataset with DatasetProduct entries', async () => {
      prisma.dataset = {
        ...prisma.dataset,
        create: jest.fn().mockResolvedValue({
          id: 10,
          name: 'manual',
          producedByBatchId: null,
          createdAt: new Date(),
          products: [],
        }),
      };
      const body = {
        name: 'manual',
        products: [
          { productId: 1, role: 'input' },
          { productId: 2, role: 'aux' },
        ],
      };
      const res = await service.create(body);
      expect(prisma.dataset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'manual',
            producedByBatchId: null,
            products: {
              create: [
                { productId: 1, role: 'input', sequence: 0 },
                { productId: 2, role: 'aux', sequence: 1 },
              ],
            },
          }),
        }),
      );
      expect(res.id).toBe(10);
    });
  });

  describe('update', () => {
    it('throws ConflictException when dataset has producedByBatchId (immutable)', async () => {
      prisma.dataset.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 1, producedByBatchId: 1 });
      await expect(service.update(1, { name: 'x' })).rejects.toThrow(
        /immutable/i,
      );
    });
    it('updates name and replaces products when mutable', async () => {
      prisma.dataset.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 1, producedByBatchId: null });
      prisma.$transaction = jest
        .fn()
        .mockImplementation(async (fn) => fn(prisma));
      prisma.datasetProduct = { deleteMany: jest.fn(), createMany: jest.fn() };
      prisma.dataset.update = jest.fn().mockResolvedValue({
        id: 1,
        name: 'new',
        producedByBatchId: null,
        createdAt: new Date(),
      });
      const res = await service.update(1, {
        name: 'new',
        products: [{ productId: 9, role: 'input' }],
      });
      expect(prisma.datasetProduct.deleteMany).toHaveBeenCalledWith({
        where: { datasetId: 1 },
      });
      expect(prisma.datasetProduct.createMany).toHaveBeenCalledWith({
        data: [{ datasetId: 1, productId: 9, role: 'input', sequence: 0 }],
      });
      expect(res.name).toBe('new');
    });
  });

  describe('delete', () => {
    it('throws ConflictException when referenced by a BatchDatasetIn', async () => {
      prisma.batchDatasetIn = { count: jest.fn().mockResolvedValue(1) };
      await expect(service.delete(1)).rejects.toThrow(/referenced/i);
    });
    it('deletes when not referenced', async () => {
      prisma.batchDatasetIn = { count: jest.fn().mockResolvedValue(0) };
      prisma.dataset.delete = jest.fn().mockResolvedValue({ id: 1 });
      await service.delete(1);
      expect(prisma.dataset.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
