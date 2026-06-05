import type { ProcessorVersion } from '@dpmc/client';

type PrismaProcessorVersion = {
  id: number;
  processingScriptVersionId: number;
  auxiliaryConfigurationId: number;
  baseline: string;
  comment: string | null;
  parameters: unknown;
  createdAt: Date;
  createdBy: string | null;
};

export const processorVersionToDto = (
  record: PrismaProcessorVersion,
): ProcessorVersion => record;
