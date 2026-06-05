import type { Batch as ApiBatch } from '@dpmc/client';

export type Batch = Omit<
  ApiBatch,
  'scheduledAt' | 'startedAt' | 'endedAt' | 'createdAt' | 'updatedAt'
> & {
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
