import type { Product } from '@dpmc/client';

type PrismaProduct = {
  id: number;
  productTypeId: number;
  parentBatchId: number | null;
  name: string;
  version: string | null;
  isDefault: boolean;
  generatedAt: Date | null;
  parameters: unknown;
  comment: string | null;
  createdAt: Date;
};

export const productToDto = (p: PrismaProduct): Product => ({ ...p });
