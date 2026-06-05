import type { AuxiliaryConfiguration } from '@dpmc/client';

type PrismaAuxiliaryConfiguration = {
  id: number;
  name: string;
  baseline: string | null;
  comment: string | null;
  parameters: unknown;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export const auxiliaryConfigurationToDto = (
  record: PrismaAuxiliaryConfiguration,
): AuxiliaryConfiguration => record;
