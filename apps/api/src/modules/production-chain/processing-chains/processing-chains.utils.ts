import type { ProcessingChainNode } from '@dpmc/client';

type PrismaProcessingChain = {
  id: number;
  name: string;
  comment: string | null;
  processingScriptId: number;
  configuration: unknown;
};

export const processingChainToDto = (
  record: PrismaProcessingChain,
): ProcessingChainNode => ({
  id: record.id,
  name: record.name,
  comment: record.comment,
  processingScriptId: record.processingScriptId,
  configuration: record.configuration,
});
