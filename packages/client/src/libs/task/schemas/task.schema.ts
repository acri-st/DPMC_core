import { z } from 'zod';
import {
  IdSchema,
  PriorityClassSchema,
  ProductionModeSchema,
} from '../../_shared';

export const TaskKindSchema = z.enum(['Chain', 'Standalone']);
export type TaskKind = z.infer<typeof TaskKindSchema>;

export const TaskStatusSchema = z.enum([
  'Edited',
  'Queued',
  'Running',
  'Done',
  'Error',
  'Suspended',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  kind: TaskKindSchema,
  productionChainId: IdSchema.nullable(),
  processorVersionId: IdSchema.nullable(),
  productId: IdSchema.nullable(),
  inputDatasetId: IdSchema.nullable(),
  executionTag: z.string(),
  status: TaskStatusSchema,
  priority: z.number().int(),
  productionMode: ProductionModeSchema,
  priorityClass: PriorityClassSchema,
  scheduledStartTime: z.coerce.date(),
  expectedStartTime: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  temporalContext: z.unknown().nullable(),
  parameters: z.unknown().nullable(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

const TaskCommonBaseSchema = z.object({
  productId: IdSchema.nullable().optional(),
  inputDatasetId: IdSchema.nullable().optional(),
  priority: z.number().int().optional(),
  productionMode: ProductionModeSchema,
  priorityClass: PriorityClassSchema.optional(),
  scheduledStartTime: z.coerce.date(),
  expectedStartTime: z.coerce.date().nullable().optional(),
  temporalContext: z.unknown().nullable().optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

const CreateTaskChainBodySchema = TaskCommonBaseSchema.extend({
  kind: z.literal('Chain'),
  productionChainId: IdSchema,
  processorVersionId: IdSchema.nullable().optional(),
});

const CreateTaskStandaloneBodySchema = TaskCommonBaseSchema.extend({
  kind: z.literal('Standalone'),
  processorVersionId: IdSchema,
  productionChainId: IdSchema.nullable().optional(),
});

export const CreateTaskBodySchema = z.discriminatedUnion('kind', [
  CreateTaskChainBodySchema,
  CreateTaskStandaloneBodySchema,
]);

export type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>;

export const UpdateTaskBodySchema = z.object({
  priority: z.number().int().optional(),
  scheduledStartTime: z.coerce.date().optional(),
  expectedStartTime: z.coerce.date().nullable().optional(),
  temporalContext: z.unknown().nullable().optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  productId: IdSchema.nullable().optional(),
  inputDatasetId: IdSchema.nullable().optional(),
  productionChainId: IdSchema.nullable().optional(),
  processorVersionId: IdSchema.nullable().optional(),
});

export type UpdateTaskBody = z.infer<typeof UpdateTaskBodySchema>;

export const UpdateTaskPriorityBodySchema = z.object({
  priority: z.number().int(),
  class: PriorityClassSchema,
});
export type UpdateTaskPriorityBody = z.infer<
  typeof UpdateTaskPriorityBodySchema
>;
