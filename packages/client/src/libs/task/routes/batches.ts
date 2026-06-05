import { z } from 'zod';
import { ApiResponseSchema, Error404Schema, Error500Schema } from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { BatchSchema } from '../../batch/schemas';
import { IdSchema } from '../../_shared';

export const TaskBatchEntrySchema = BatchSchema.extend({
  scripts: z
    .array(z.object({ acronym: z.string(), name: z.string() }))
    .default([]),
  hosts: z
    .array(z.object({ id: IdSchema, hostname: z.string() }))
    .default([]),
});
export type TaskBatchEntry = z.infer<typeof TaskBatchEntrySchema>;

export const TaskBatchesResponse200Schema = ApiResponseSchema.extend({
  data: TaskBatchEntrySchema.array(),
});
export type TaskBatchesResponse200 = z.infer<
  typeof TaskBatchesResponse200Schema
>;

export const TaskBatchesRoute = {
  method: METHODS.GET,
  path: PATHS.TASK.BATCHES,
  responses: {
    200: TaskBatchesResponse200Schema,
    404: Error404Schema,
    500: Error500Schema,
  },
};
