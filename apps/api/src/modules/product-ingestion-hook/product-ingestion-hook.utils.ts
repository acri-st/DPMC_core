import type { ProductIngestionHook } from '@dpmc/client';
import type { ProductionMode } from '@dpmc/prisma';

type PrismaProductIngestionHook = {
  id: number;
  productTypeId: number;
  productionChainId: number | null;
  projectId: number;
  productionMode: ProductionMode;
  enabled: boolean;
  createdAt: Date;
};

export const productIngestionHookToDto = (
  record: PrismaProductIngestionHook,
): ProductIngestionHook => record;
