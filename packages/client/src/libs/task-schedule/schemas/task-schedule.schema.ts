import { z } from 'zod';
import {
  IdSchema,
  PriorityClassSchema,
  ProductionModeSchema,
} from '../../_shared';
import { TaskKindSchema } from '../../task/schemas';

export const TaskScheduleSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  name: z.string(),
  enabled: z.boolean(),
  cronExpression: z.string(),
  timezone: z.string(),
  kind: TaskKindSchema,
  productionChainId: IdSchema.nullable(),
  processorVersionId: IdSchema.nullable(),
  productId: IdSchema.nullable(),
  productionMode: ProductionModeSchema,
  priority: z.number().int(),
  priorityClass: PriorityClassSchema,
  parameters: z.unknown().nullable(),
  comment: z.string().nullable(),
  lastRunAt: z.coerce.date().nullable(),
  nextRunAt: z.coerce.date().nullable(),
  lastTaskId: IdSchema.nullable(),
  lastError: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;

const TaskScheduleTemplateBaseSchema = z.object({
  name: z.string().min(1).max(120),
  cronExpression: z.string().min(1).max(120),
  timezone: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  productId: IdSchema.nullable().optional(),
  priority: z.number().int().optional(),
  productionMode: ProductionModeSchema,
  priorityClass: PriorityClassSchema.optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

const CreateTaskScheduleChainSchema = TaskScheduleTemplateBaseSchema.extend({
  kind: z.literal('Chain'),
  productionChainId: IdSchema,
  processorVersionId: IdSchema.nullable().optional(),
});

const CreateTaskScheduleStandaloneSchema =
  TaskScheduleTemplateBaseSchema.extend({
    kind: z.literal('Standalone'),
    processorVersionId: IdSchema,
    productionChainId: IdSchema.nullable().optional(),
  });

export const CreateTaskScheduleBodySchema = z.discriminatedUnion('kind', [
  CreateTaskScheduleChainSchema,
  CreateTaskScheduleStandaloneSchema,
]);

export type CreateTaskScheduleBody = z.infer<
  typeof CreateTaskScheduleBodySchema
>;

// Update is a flat partial: every field optional, no discriminated union so a
// PATCH can toggle `enabled` or change the cron without re-sending the template.
export const UpdateTaskScheduleBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  cronExpression: z.string().min(1).max(120).optional(),
  timezone: z.string().min(1).max(64).optional(),
  productionChainId: IdSchema.nullable().optional(),
  processorVersionId: IdSchema.nullable().optional(),
  productId: IdSchema.nullable().optional(),
  priority: z.number().int().optional(),
  priorityClass: PriorityClassSchema.optional(),
  parameters: z.unknown().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export type UpdateTaskScheduleBody = z.infer<
  typeof UpdateTaskScheduleBodySchema
>;
