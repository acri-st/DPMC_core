import type { Task } from '@dpmc/client';
import type {
  PriorityClass,
  ProductionMode,
  TaskKind,
  TaskStatus,
} from '@dpmc/prisma';

type PrismaTask = {
  id: number;
  projectId: number;
  kind: TaskKind;
  productionChainId: number | null;
  processorVersionId: number | null;
  productId: number | null;
  inputDatasetId: number | null;
  executionTag: string;
  status: TaskStatus;
  priority: number;
  productionMode: ProductionMode;
  priorityClass: PriorityClass;
  scheduledStartTime: Date;
  expectedStartTime: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  temporalContext: unknown;
  parameters: unknown;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export const taskToDto = (record: PrismaTask): Task => record;
