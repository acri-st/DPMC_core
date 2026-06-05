import type { Task as ApiTask } from '@dpmc/client';

export type Task = Omit<
  ApiTask,
  | 'scheduledStartTime'
  | 'expectedStartTime'
  | 'startedAt'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
> & {
  scheduledStartTime: string;
  expectedStartTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
