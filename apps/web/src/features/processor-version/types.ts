import type { ProcessorVersion as ApiProcessorVersion } from '@dpmc/client';

export type ProcessorVersion = Omit<ApiProcessorVersion, 'createdAt'> & {
  createdAt: string;
};
