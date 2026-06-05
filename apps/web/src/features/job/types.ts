import type { Job as ApiJob } from '@dpmc/client';

export type Job = Omit<
  ApiJob,
  | 'dataVolume'
  | 'expectedStartTime'
  | 'startedAt'
  | 'endedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  dataVolume: number | null;
  expectedStartTime: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
